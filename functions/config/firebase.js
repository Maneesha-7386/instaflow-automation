/**
 * Firebase Admin SDK Initialization (Server-Side)
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'instaflow-a6c18';
  admin.initializeApp({ projectId });
}

const adminApp = admin.app();
const adminAuth = admin.auth();
const adminDb = admin.firestore();
const adminStorage = admin.storage();

module.exports = {
  admin,
  adminApp,
  adminAuth,
  adminDb,
  adminStorage,
};

