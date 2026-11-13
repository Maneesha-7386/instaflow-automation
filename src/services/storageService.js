/**
 * Firebase Storage Integration Service
 * Handles resumable uploads and deletions for user videos, thumbnails, and posts.
 */
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates a media file before uploading to Firebase Storage.
 */
export function validateMediaFile(file, kind = 'video') {
  if (!file) {
    throw new Error('No file selected.');
  }

  if (kind === 'video') {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error('Unsupported video format. Please upload MP4, MOV, or WebM.');
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('Video exceeds the 100 MB upload limit.');
    }
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Unsupported image format. Please upload JPG, PNG, or WebP.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Image exceeds the 10 MB upload limit.');
    }
  }
}

function normalizeStorageError(error) {
  const code = error?.code || '';
  if (
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    code === 'storage/unknown' ||
    code === 'storage/retry-limit-exceeded'
  ) {
    return new Error(
      'Firebase Storage bucket is not provisioned on the Spark plan yet. Keeping local browser preview active (or use Firebase Storage Emulator locally).'
    );
  }
  if (code === 'storage/unauthorized') {
    return new Error(
      'Firebase Storage blocked this upload (check storage.rules or Storage provisioning). Local preview remains active.'
    );
  }
  return new Error(error?.message || 'Upload to Firebase Storage failed. Local preview remains active.');
}

/**
 * Uploads a user file to `users/{userId}/{folder}/{timestamp}_{filename}`.
 * Returns { downloadUrl, storagePath, fileName, contentType, size }.
 */
export function uploadMediaFile(userId, file, folder = 'reels', onProgress) {
  if (!isFirebaseConfigured || !storage) {
    return Promise.reject(new Error('Firebase Storage is not configured.'));
  }
  if (!userId) {
    return Promise.reject(new Error('You must be signed in to upload files to Storage.'));
  }

  const kind = file.type.startsWith('image/') ? 'image' : 'video';
  validateMediaFile(file, kind);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${userId}/${folder}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        reject(normalizeStorageError(error));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Deletes a previously uploaded file from Firebase Storage by its storagePath.
 */
export async function deleteStorageFile(storagePath) {
  if (!isFirebaseConfigured || !storage || !storagePath) return;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('[Storage] Delete warning:', err?.message || err);
    }
  }
}

