/**
 * InstaFlow Automated Scheduling & Publishing Service
 * Handles validation, automated execution of due scheduled posts,
 * status tracking (Scheduled -> Publishing -> Published | Failed),
 * Firestore history audit logging, and retry logic.
 */
const { adminDb, admin } = require('../config/firebase');
const { getVaultToken } = require('./vaultService');
const { publishMediaToInstagram } = require('./metaGraphService');

function isTransientError(err) {
  if (!err) return false;
  if (err.retryable) return true;
  const code = err.metaError?.code || err.code;
  if (code === 'CONTAINER_STILL_PROCESSING') return true;
  if ([4, 17, 32, 613, 2, 1].includes(Number(code))) return true;
  if (
    err.message &&
    (err.message.includes('ETIMEDOUT') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('network') ||
      err.message.includes('processing'))
  ) {
    return true;
  }
  return false;
}

function countHashtags(text) {
  if (!text) return 0;
  const matches = text.match(/#\w+/g);
  return matches ? matches.length : 0;
}

/**
 * Validates a media item before scheduling or publishing
 */
function validateMediaItem(item, { isScheduled = false, nowMs = Date.now() } = {}) {
  if (!item) {
    return { valid: false, error: 'Media item is null or undefined.', code: 'ITEM_NULL' };
  }

  const kind = item.kind === 'Post' ? 'Post' : 'Reel';

  // 1. Account validation
  if (!item.igUserId && !item.accountId) {
    return {
      valid: false,
      error: 'No connected Instagram account is assigned to this content.',
      code: 'ACCOUNT_MISSING',
      retryable: false,
    };
  }

  // 2. Media availability validation
  const mediaUrl = kind === 'Post'
    ? (item.coverUrl || item.imageUrl || item.videoUrl || '')
    : (item.videoUrl || '');

  if (!mediaUrl) {
    return {
      valid: false,
      error: kind === 'Post'
        ? 'Image media is missing for this Post. Upload an image before publishing.'
        : 'Video media is missing for this Reel. Upload an MP4/MOV/WebM video before publishing.',
      code: 'MEDIA_MISSING',
      retryable: false,
    };
  }

  if (mediaUrl.startsWith('blob:')) {
    return {
      valid: false,
      error: 'Instagram publishing requires a public HTTPS media URL. Local blob URLs cannot be retrieved by Meta servers.',
      code: 'MEDIA_BLOB_UNSUPPORTED',
      retryable: false,
    };
  }

  if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
    return {
      valid: false,
      error: 'Media URL must be a valid HTTP or HTTPS web address accessible by Meta.',
      code: 'MEDIA_URL_INVALID',
      retryable: false,
    };
  }

  // 3. Caption and hashtags validation
  const caption = item.caption || '';
  if (caption.length > 2200) {
    return {
      valid: false,
      error: `Caption exceeds Instagram maximum limit of 2,200 characters (current: ${caption.length}).`,
      code: 'CAPTION_TOO_LONG',
      retryable: false,
    };
  }

  if (countHashtags(caption) > 30) {
    return {
      valid: false,
      error: `Hashtags exceed Instagram maximum limit of 30 hashtags (current: ${countHashtags(caption)}).`,
      code: 'TOO_MANY_HASHTAGS',
      retryable: false,
    };
  }

  // 4. Scheduled time validation (for automated scheduler runs)
  if (isScheduled && item.scheduledTimestamp) {
    const scheduledMs = Date.parse(item.scheduledTimestamp);
    if (!isNaN(scheduledMs) && scheduledMs > nowMs) {
      return {
        valid: false,
        due: false,
        error: `Scheduled time (${item.scheduledTimestamp}) has not arrived yet.`,
        code: 'SCHEDULE_NOT_DUE',
      };
    }
  }

  return {
    valid: true,
    due: true,
    mediaUrl,
    kind,
    caption,
    coverUrl: item.coverUrl || '',
    igUserId: item.igUserId,
  };
}

function withTimeout(promise, ms = 1200) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timed out')), ms)
    ),
  ]);
}

async function safeUpdateFirestoreDoc(collectionName, docId, data) {
  if (!docId) return false;
  try {
    await withTimeout(
      adminDb.collection(collectionName).doc(docId).set(
        {
          ...data,
          updatedAt: admin.firestore?.FieldValue?.serverTimestamp
            ? admin.firestore.FieldValue.serverTimestamp()
            : new Date(),
        },
        { merge: true }
      ),
      1000
    );
    return true;
  } catch {
    // Expected when running local backend without GCP service credentials
    return false;
  }
}

async function logHistoryEntry({ userId, source, message, account, status, reelId, igMediaId, errorDetails, retryable, kind }) {
  const historyItem = {
    userId: userId || 'local_user',
    source: source || 'Publisher',
    message,
    account: account || '@unassigned',
    status: status || 'success',
    reelId: reelId || null,
    igMediaId: igMediaId || null,
    errorDetails: errorDetails || null,
    retryable: Boolean(retryable),
    kind: kind || 'Reel',
    time: `Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    createdAtMs: Date.now(),
  };

  try {
    await withTimeout(
      adminDb.collection('history').add({
        ...historyItem,
        createdAt: admin.firestore?.FieldValue?.serverTimestamp
          ? admin.firestore.FieldValue.serverTimestamp()
          : new Date(),
      }),
      1000
    );
  } catch {
    // Expected in local dev without service credentials
  }

  return historyItem;
}

/**
 * Publishes a single media item (Reel or Post) with full status tracking,
 * validation, Meta API call, and history audit logging.
 */
async function publishSingleMedia(item, { isScheduled = false, userId = null } = {}) {
  const uid = userId || item.userId || 'local_user';
  const reelId = item.id;
  const title = item.title || item.caption?.slice(0, 32) || 'Untitled';
  const sourceName = isScheduled ? 'Scheduled Publisher' : 'Direct Publisher';

  // Step 1: Update status to 'publishing'
  await safeUpdateFirestoreDoc('mediaContent', reelId, {
    status: 'publishing',
    lastAttemptAt: new Date().toISOString(),
  });

  // Step 2: Validation check
  const validation = validateMediaItem(item, { isScheduled });
  if (!validation.valid) {
    if (validation.due === false) {
      // Not due yet, revert back to scheduled
      await safeUpdateFirestoreDoc('mediaContent', reelId, { status: 'scheduled' });
      return {
        ok: false,
        skipped: true,
        reelId,
        title,
        reason: validation.error,
      };
    }

    const errorDetails = {
      code: validation.code,
      message: validation.error,
      timestamp: new Date().toISOString(),
    };

    const newRetryCount = (item.retryCount || 0) + 1;
    await safeUpdateFirestoreDoc('mediaContent', reelId, {
      status: 'failed',
      errorMessage: validation.error,
      errorDetails,
      retryCount: newRetryCount,
      maxRetries: 3,
      retryable: false,
      lastAttemptAt: new Date().toISOString(),
    });

    await logHistoryEntry({
      userId: uid,
      source: sourceName,
      message: `Publish validation failed for “${title}”: ${validation.error}`,
      account: item.accountHandle || '@unassigned',
      status: 'failed',
      reelId,
      errorDetails,
      retryable: false,
      kind: item.kind || 'Reel',
    });

    const err = new Error(validation.error);
    err.code = validation.code;
    err.errorDetails = errorDetails;
    throw err;
  }

  // Step 3: Vaulted token lookup
  let vaultRecord;
  try {
    vaultRecord = await getVaultToken(uid, validation.igUserId);
  } catch (vaultErr) {
    const errorDetails = {
      code: vaultErr.code || 'VAULT_TOKEN_MISSING',
      message: vaultErr.message,
      timestamp: new Date().toISOString(),
    };

    const newRetryCount = (item.retryCount || 0) + 1;
    await safeUpdateFirestoreDoc('mediaContent', reelId, {
      status: 'failed',
      errorMessage: vaultErr.message,
      errorDetails,
      retryCount: newRetryCount,
      maxRetries: 3,
      retryable: false,
      lastAttemptAt: new Date().toISOString(),
    });

    await logHistoryEntry({
      userId: uid,
      source: sourceName,
      message: `Publish failed for “${title}”: ${vaultErr.message}`,
      account: item.accountHandle || '@unassigned',
      status: 'failed',
      reelId,
      errorDetails,
      retryable: false,
      kind: validation.kind,
    });

    throw vaultErr;
  }

  // Step 4: Execute official Meta Graph API publishing
  try {
    const publishRes = await publishMediaToInstagram({
      igUserId: validation.igUserId,
      pageAccessToken: vaultRecord.pageAccessToken,
      kind: validation.kind,
      mediaUrl: validation.mediaUrl,
      caption: validation.caption,
      coverUrl: validation.coverUrl,
    });

    // Step 5: Success state tracking
    const publishedDateText = `Published ${new Date().toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    })}`;

    await safeUpdateFirestoreDoc('mediaContent', reelId, {
      status: 'published',
      dateText: publishedDateText,
      igMediaId: publishRes.publishedMediaId,
      creationId: publishRes.creationId,
      errorMessage: null,
      errorDetails: null,
      publishedAt: new Date().toISOString(),
      publishedAtMs: Date.now(),
      lastAttemptAt: new Date().toISOString(),
    });

    await logHistoryEntry({
      userId: uid,
      source: sourceName,
      message: `Published “${title}” to Instagram (${publishRes.publishedMediaId})`,
      account: item.accountHandle || '@unassigned',
      status: 'success',
      reelId,
      igMediaId: publishRes.publishedMediaId,
      kind: validation.kind,
    });

    return {
      ok: true,
      status: 'published',
      reelId,
      title,
      igMediaId: publishRes.publishedMediaId,
      creationId: publishRes.creationId,
      dateText: publishedDateText,
    };
  } catch (publishErr) {
    // Step 6: Failure state tracking with Meta Graph API error inspection
    const retryable = isTransientError(publishErr);
    const newRetryCount = (item.retryCount || 0) + 1;
    const metaError = publishErr.metaError || null;

    const errorDetails = {
      code: metaError?.code || publishErr.code || 'META_API_ERROR',
      subcode: metaError?.error_subcode || null,
      type: metaError?.type || null,
      fbtrace_id: metaError?.fbtrace_id || null,
      message: publishErr.message,
      timestamp: new Date().toISOString(),
    };

    await safeUpdateFirestoreDoc('mediaContent', reelId, {
      status: 'failed',
      errorMessage: publishErr.message,
      errorDetails,
      retryCount: newRetryCount,
      maxRetries: 3,
      retryable,
      lastAttemptAt: new Date().toISOString(),
    });

    await logHistoryEntry({
      userId: uid,
      source: sourceName,
      message: `Publish failed for “${title}”: ${publishErr.message}`,
      account: item.accountHandle || '@unassigned',
      status: 'failed',
      reelId,
      errorDetails,
      retryable,
      kind: validation.kind,
    });

    const enrichedErr = new Error(publishErr.message);
    enrichedErr.code = errorDetails.code;
    enrichedErr.errorDetails = errorDetails;
    enrichedErr.retryable = retryable;
    enrichedErr.metaError = metaError;
    throw enrichedErr;
  }
}

/**
 * Checks and executes publishing for all due scheduled media
 */
async function processDueScheduledItems({
  nowMs = Date.now(),
  maxBatch = 10,
  userId = null,
  candidateItems = null,
} = {}) {
  let itemsToScan = candidateItems;

  if (!itemsToScan || !Array.isArray(itemsToScan)) {
    itemsToScan = [];
    try {
      let query = adminDb.collection('mediaContent').where('status', '==', 'scheduled');
      if (userId) {
        query = query.where('userId', '==', userId);
      }
      const snap = await query.limit(maxBatch).get();
      snap.forEach((doc) => {
        itemsToScan.push({ id: doc.id, ...doc.data() });
      });
    } catch {
      // Local dev without GCP service account credentials
    }
  }

  // Filter only items that are due
  const dueItems = itemsToScan.filter((item) => {
    if (item.status !== 'scheduled') return false;
    if (!item.scheduledTimestamp) return false;
    const itemMs = Date.parse(item.scheduledTimestamp);
    return !isNaN(itemMs) && itemMs <= nowMs;
  });

  const results = [];
  let successes = 0;
  let failures = 0;

  for (const item of dueItems.slice(0, maxBatch)) {
    try {
      const res = await publishSingleMedia(item, {
        isScheduled: true,
        userId: userId || item.userId,
      });
      results.push(res);
      successes++;
    } catch (err) {
      results.push({
        ok: false,
        status: 'failed',
        reelId: item.id,
        title: item.title,
        error: err.message,
        errorDetails: err.errorDetails || null,
        retryable: err.retryable || false,
      });
      failures++;
    }
  }

  return {
    checked: itemsToScan.length,
    dueCount: dueItems.length,
    processed: results.length,
    successes,
    failures,
    results,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  validateMediaItem,
  publishSingleMedia,
  processDueScheduledItems,
  logHistoryEntry,
  isTransientError,
};
