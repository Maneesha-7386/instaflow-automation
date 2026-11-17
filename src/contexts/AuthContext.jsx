import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef';
import {
  auth,
  isFirebaseConfigured,
  googleProvider,
  verifyFirestoreConnection,
} from '../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import {
  syncUserProfile,
  subscribeToUserProfile,
} from '../services/firestoreService';

const DEFAULT_DEMO_USER = {
  uid: 'demo_user_001',
  email: 'creator@lumenstudio.com',
  displayName: 'Lumen Studio Admin',
  photoURL: null,
  plan: 'Growth plan',
  runsUsed: 1860,
  runsLimit: 3000,
  isDemo: true,
};

const formatAuthError = (err) => {
  if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
    return 'Authentication provider is not enabled yet in Firebase Console (Build → Authentication → Sign-in method).';
  }
  if (err?.code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
    return 'Invalid email or password.';
  }
  if (err?.code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.';
  }
  return err?.message || 'Authentication failed';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('instaflow_current_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(Boolean(isFirebaseConfigured && auth));
  const [authError, setAuthError] = useState(null);
  const [firestoreStatus, setFirestoreStatus] = useState(null);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('instaflow_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('instaflow_current_user');
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }

    verifyFirestoreConnection().then((result) => {
      setFirestoreStatus(result);
      if (result.ok) {
        console.info('[InstaFlow] Firestore check:', result.message);
      } else {
        console.warn('[InstaFlow] Firestore check failed:', result.message);
      }
    });

    let unsubProfile = () => {};

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        unsubProfile();

        if (firebaseUser) {
          let profileData = null;
          try {
            profileData = await syncUserProfile(firebaseUser);
          } catch (err) {
            console.warn('[InstaFlow] Firestore user profile sync warning:', err.message);
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName:
              firebaseUser.displayName ||
              profileData?.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'Creator',
            photoURL: firebaseUser.photoURL,
            plan: profileData?.plan || 'Growth plan',
            runsUsed: profileData?.runsUsed ?? 0,
            runsLimit: profileData?.runsLimit ?? 3000,
            isDemo: false,
          });

          unsubProfile = subscribeToUserProfile(firebaseUser.uid, (liveProfile) => {
            setUser((prev) =>
              prev && prev.uid === firebaseUser.uid
                ? {
                    ...prev,
                    displayName: liveProfile.displayName || prev.displayName,
                    plan: liveProfile.plan || prev.plan,
                    runsUsed: liveProfile.runsUsed ?? prev.runsUsed,
                    runsLimit: liveProfile.runsLimit ?? prev.runsLimit,
                  }
                : prev
            );
          });
        } else {
          setUser((prev) => (prev?.isDemo ? prev : null));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase Auth State Error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => {
      unsubProfile();
      unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email, password, rememberMe = true) => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setUser({
        uid: 'demo_custom_' + Date.now(),
        email,
        displayName: email.split('@')[0],
        plan: 'Growth plan',
        runsUsed: 1860,
        runsLimit: 3000,
        isDemo: true,
      });
      return { success: true, mode: 'demo' };
    }

    try {
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
      } catch (persistErr) {
        console.warn('[InstaFlow] Auth persistence set warning:', persistErr.message);
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: cred.user };
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email) => {
    setAuthError(null);
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!isFirebaseConfigured || !auth) {
      return {
        success: true,
        mode: 'demo',
        message: `Password reset simulation: reset link would be sent to ${email}`,
      };
    }

    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: `Password reset email sent to ${email}. Check your inbox!`,
      };
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const registerWithEmail = async (email, password, displayName) => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setUser({
        uid: 'demo_new_' + Date.now(),
        email,
        displayName: displayName || email.split('@')[0],
        plan: 'Starter plan',
        runsUsed: 0,
        runsLimit: 1000,
        isDemo: true,
      });
      return { success: true, mode: 'demo' };
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName?.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      return { success: true, user: cred.user };
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setUser({
        uid: 'demo_google_' + Date.now(),
        email: 'google.creator@lumenstudio.com',
        displayName: 'Google Creator',
        plan: 'Growth plan',
        runsUsed: 1860,
        runsLimit: 3000,
        isDemo: true,
      });
      return { success: true, mode: 'demo' };
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      return { success: true, user: res.user };
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    setUser(null);
    try {
      localStorage.removeItem('instaflow_current_user');
    } catch {}
  };

  const setDemoSession = () => {
    setUser(DEFAULT_DEMO_USER);
  };

  const initCreatorSession = (creatorInfo = {}) => {
    const rawHandle = (creatorInfo.handle || 'creator').replace(/^@+/, '');
    const creatorUser = {
      uid: 'user_' + Date.now(),
      email: creatorInfo.email || `${rawHandle}@gmail.com`,
      displayName: creatorInfo.name || creatorInfo.handle || 'Creator',
      photoURL: creatorInfo.profilePictureUrl || null,
      plan: 'Growth plan',
      runsUsed: 0,
      runsLimit: 3000,
      isDemo: false,
    };
    setUser(creatorUser);
    try {
      localStorage.setItem('instaflow_current_user', JSON.stringify(creatorUser));
    } catch {}
    return creatorUser;
  };

  const getIdToken = useCallback(async () => {
    if (!isFirebaseConfigured || !auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        firestoreStatus,
        isFirebaseLive: isFirebaseConfigured,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        loginWithGoogle,
        logout,
        setDemoSession,
        initCreatorSession,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
