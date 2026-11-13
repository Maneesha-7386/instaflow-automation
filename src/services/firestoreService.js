/**
 * Cloud Firestore Integration Service
 * Handles user profile sync, real-time collection subscriptions, and CRUD persistence.
 */
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

export const COLLECTIONS = {
  USERS: 'users',
  ACCOUNTS: 'instagramAccounts',
  MEDIA: 'mediaContent',
  AI_GENERATIONS: 'aiGenerations',
  AUTOMATIONS: 'automations',
  HISTORY: 'history',
};

/**
 * Syncs authenticated Firebase user profile to Firestore `users/{uid}` document.
 */
export async function syncUserProfile(user) {
  if (!isFirebaseConfigured || !db || !user?.uid || user.isDemo) return null;

  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Creator',
      photoURL: user.photoURL || null,
      plan: 'Growth plan',
      runsUsed: 0,
      runsLimit: 3000,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userRef, profile);
    return profile;
  }

  await updateDoc(userRef, {
    email: user.email || snap.data().email || '',
    displayName: user.displayName || snap.data().displayName || 'Creator',
    photoURL: user.photoURL || snap.data().photoURL || null,
    lastLoginAt: serverTimestamp(),
  });

  return snap.data();
}

/**
 * Subscribes to the user's profile document (`users/{uid}`) in real time.
 */
export function subscribeToUserProfile(userId, onData, onError) {
  if (!isFirebaseConfigured || !db || !userId) {
    return () => {};
  }

  const userRef = doc(db, COLLECTIONS.USERS, userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onData({ uid: snap.id, ...snap.data() });
      }
    },
    (error) => {
      console.error('[Firestore] User profile subscription error:', error.message);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to a user-scoped Firestore collection in real time.
 * Sorts client-side via `createdAtMs` to avoid requiring composite Firestore indexes.
 */
export function subscribeToUserCollection(
  collectionName,
  userId,
  { sortOrder = 'desc', onData, onError }
) {
  if (!isFirebaseConfigured || !db || !userId) {
    return () => {};
  }

  const q = query(collection(db, collectionName), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      items.sort((a, b) => {
        const aTime = a.createdAtMs || 0;
        const bTime = b.createdAtMs || 0;
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      });

      onData(items);
    },
    (error) => {
      console.error(`[Firestore] Subscription error on ${collectionName}:`, error.message);
      if (onError) onError(error);
    }
  );
}

/**
 * Generic Firestore document CRUD helpers
 */
export async function createUserDocument(collectionName, userId, data) {
  if (!isFirebaseConfigured || !db || !userId) return null;
  const { id: _ignoreId, ...cleanData } = data;
  const docRef = await addDoc(collection(db, collectionName), {
    ...cleanData,
    userId,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateUserDocument(collectionName, docId, updates) {
  if (!isFirebaseConfigured || !db || !docId) return;
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserDocument(collectionName, docId) {
  if (!isFirebaseConfigured || !db || !docId) return;
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

export async function incrementUserRuns(userId, delta = 1) {
  if (!isFirebaseConfigured || !db || !userId) return;
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    runsUsed: increment(delta),
    updatedAt: serverTimestamp(),
  });
}
