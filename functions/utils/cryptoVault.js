/**
 * AES-256-GCM Token Vault Cipher
 * Encrypts and decrypts Meta OAuth tokens before persisting to `vault_secrets`.
 */
const crypto = require('crypto');
const { envConfig } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const rawKey = envConfig.security.tokenEncryptionKey;
  if (!rawKey || rawKey.startsWith('YOUR_')) {
    const err = new Error(
      'TOKEN_ENCRYPTION_KEY is not configured in functions/.env. Set a 32-byte secret before encrypting OAuth tokens.'
    );
    err.statusCode = 503;
    err.code = 'ENCRYPTION_KEY_MISSING';
    throw err;
  }
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
}

function encryptSecret(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    algorithm: ALGORITHM,
  };
}

function decryptSecret(payload) {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

module.exports = {
  encryptSecret,
  decryptSecret,
};

