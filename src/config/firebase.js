/**
 * Firebase Client Initialization, Configuration Check & Connectivity Verification
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isEmulatorEnabled = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

// Check if actual configuration credentials are provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId !== 'your-app-id'
);

let app = null;
let auth = null;
let db = null;
let storage = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();

    if (isEmulatorEnabled && typeof window !== 'undefined' && !window.__instaflowEmulatorsConnected) {
      try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        connectStorageEmulator(storage, '127.0.0.1', 9199);
        window.__instaflowEmulatorsConnected = true;
        console.info('[InstaFlow] Connected to local Firebase Emulator Suite (Auth, Firestore, Storage).');
      } catch (emuErr) {
        console.warn('[InstaFlow] Emulator connection warning:', emuErr.message);
      }
    } else {
      console.info('[InstaFlow] Connected to Firebase live project:', firebaseConfig.projectId);
    }
  } catch (err) {
    console.warn('[InstaFlow] Firebase initialization error:', err.message);
  }
} else {
  console.info(
    '[InstaFlow] Running in Local Demo Mode. Add real Firebase configuration in .env using VITE_FIREBASE_API_KEY, etc.'
  );
}

/**
 * Verifies live connectivity to Cloud Firestore by forcing a server read.
 * Distinguishes between full access, security rule restriction, and unreachable/uninitialized DB.
 */
export async function verifyFirestoreConnection() {
  if (!isFirebaseConfigured || !db) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'Firebase environment variables are not configured.',
    };
  }

  try {
    const pingRef = doc(db, '_connection_check', 'ping');
    await getDocFromServer(pingRef);
    return {
      ok: true,
      status: 'connected',
      projectId: firebaseConfig.projectId,
      message: 'Connected to Cloud Firestore (read verified).',
    };
  } catch (err) {
    if (err?.code === 'permission-denied') {
      return {
        ok: true,
        status: 'connected_rules_restricted',
        projectId: firebaseConfig.projectId,
        message: 'Reached Cloud Firestore; unauthenticated reads blocked by Security Rules (expected if rules require auth).',
      };
    }

    return {
      ok: false,
      status: err?.code || 'error',
      projectId: firebaseConfig.projectId,
      message: err?.message || 'Failed to connect to Cloud Firestore.',
    };
  }
}

export { app, auth, db, storage, googleProvider };
