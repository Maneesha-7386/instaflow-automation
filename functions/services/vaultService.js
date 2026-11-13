/**
 * Meta OAuth Token Vault Service
 * Handles storing, retrieving, and decrypting tokens with AES-256-GCM encryption.
 * Supports Cloud Firestore `vault_secrets` when deployed/credentialed,
 * with encrypted local file fallback (`functions/.local_vault.json`) for Spark/local development.
 */
const fs = require('fs');
const path = require('path');
const { adminDb, admin } = require('../config/firebase');
const { encryptSecret, decryptSecret } = require('../utils/cryptoVault');

const LOCAL_VAULT_FILE = path.resolve(__dirname, '../.local_vault.json');

function readLocalVaultFile() {
  if (!fs.existsSync(LOCAL_VAULT_FILE)) return {};
  try {
    const raw = fs.readFileSync(LOCAL_VAULT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[VaultService] Failed to read local vault file:', err.message);
    return {};
  }
}

function writeLocalVaultFile(data) {
  try {
    fs.writeFileSync(LOCAL_VAULT_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[VaultService] Failed to write local vault file:', err.message);
  }
}

/**
 * Saves encrypted token payload to Firestore vault_secrets and/or local vault file
 */
async function saveVaultToken(userId, igUserId, payload) {
  const docId = `${userId}_${igUserId}`;
  const tokenPayload = typeof payload === 'string' ? { pageAccessToken: payload } : (payload || {});
  const record = {
    userId,
    igUserId,
    pageId: tokenPayload.pageId || null,
    encryptedUserToken:
      tokenPayload.encryptedUserToken ||
      (tokenPayload.userAccessToken ? encryptSecret(tokenPayload.userAccessToken) : null),
    encryptedPageToken:
      tokenPayload.encryptedPageToken ||
      (tokenPayload.pageAccessToken ? encryptSecret(tokenPayload.pageAccessToken) : null),
    expiresAtMs: tokenPayload.expiresAtMs || Date.now() + 60 * 86400 * 1000,
    updatedAt: new Date().toISOString(),
  };

  // Always keep local encrypted fallback for offline/local development
  const localData = readLocalVaultFile();
  localData[docId] = record;
  writeLocalVaultFile(localData);

  let firestoreSaved = false;
  try {
    await adminDb.collection('vault_secrets').doc(docId).set({
      ...record,
      updatedAt: admin.firestore?.FieldValue?.serverTimestamp
        ? admin.firestore.FieldValue.serverTimestamp()
        : new Date(),
    });
    firestoreSaved = true;
  } catch {
    // Expected in local dev when no service account credentials exist
  }

  return { docId, firestoreSaved };
}

/**
 * Retrieves and decrypts the vaulted page token for a user and Instagram account
 */
async function getVaultToken(userId, igUserId) {
  const docId = `${userId}_${igUserId}`;
  let record = null;

  // In local development or fallback, check local encrypted vault first
  const localData = readLocalVaultFile();
  if (localData[docId]) {
    record = localData[docId];
  }

  if (!record) {
    try {
      const snap = await adminDb.collection('vault_secrets').doc(docId).get();
      if (snap.exists) {
        record = snap.data();
      }
    } catch {
      // Admin DB read failed (e.g. local credentials not configured)
    }
  }

  if (!record) {
    const err = new Error(
      `No vaulted Meta OAuth token found for Instagram user ${igUserId}. Please connect via Meta OAuth in Accounts.`
    );
    err.statusCode = 404;
    err.code = 'VAULT_TOKEN_NOT_FOUND';
    throw err;
  }

  if (record.expiresAtMs && Date.now() > record.expiresAtMs) {
    const err = new Error(
      `Meta OAuth token for Instagram user ${igUserId} has expired. Please reconnect your account.`
    );
    err.statusCode = 401;
    err.code = 'VAULT_TOKEN_EXPIRED';
    throw err;
  }

  const pageAccessToken = record.encryptedPageToken ? decryptSecret(record.encryptedPageToken) : null;
  const userAccessToken = record.encryptedUserToken ? decryptSecret(record.encryptedUserToken) : null;

  return {
    docId,
    userId: record.userId,
    igUserId: record.igUserId,
    pageId: record.pageId,
    pageAccessToken,
    userAccessToken,
    expiresAtMs: record.expiresAtMs,
  };
}

/**
 * Removes a vaulted token
 */
async function deleteVaultToken(userId, igUserId) {
  const docId = `${userId}_${igUserId}`;

  try {
    await adminDb.collection('vault_secrets').doc(docId).delete();
  } catch {
    // Ignored in local dev
  }

  const localData = readLocalVaultFile();
  if (localData[docId]) {
    delete localData[docId];
    writeLocalVaultFile(localData);
  }

  return true;
}

async function hasVaultToken(userId, igUserId) {
  try {
    const token = await getVaultToken(userId, igUserId);
    return Boolean(token && (token.pageAccessToken || token.userAccessToken));
  } catch {
    return false;
  }
}

module.exports = {
  saveVaultToken,
  getVaultToken,
  hasVaultToken,
  deleteVaultToken,
};
