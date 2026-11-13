import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  verifyBeforeUpdateEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { auth, firebaseConfig } from '../firebase/firebase';

// Ensure local persistence is set immediately on module load
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch {
  // Ignore fallback
}

const getStoredUser = () => {
  try {
    const saved = localStorage.getItem('athahar_user') || localStorage.getItem('atharva_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(!getStoredUser());
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Real Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const formattedUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName ||
            (firebaseUser.email ? firebaseUser.email.split('@')[0].toUpperCase() : 'ADMINISTRATOR'),
          raw: firebaseUser,
        };
        setUser(formattedUser);
        try {
          localStorage.setItem('athahar_user', JSON.stringify({
            uid: formattedUser.uid,
            email: formattedUser.email,
            displayName: formattedUser.displayName,
          }));
        } catch {
          // Ignore localStorage quota errors
        }
      } else {
        // If Firebase temporarily returns null (e.g. background token renewal or transient offline state),
        // preserve the cached operator session unless the user has explicitly logged out.
        const stored = getStoredUser();
        if (!stored) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Proactive Keep-Alive: Automatically renew token before the 60-minute Firebase limit
  useEffect(() => {
    const keepSessionAlive = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
      } catch (err) {
        // Silently ignore network blips; local session stays active
        console.warn('Keep-alive session renewal postponed (offline or network pause):', err?.message);
      }
    };

    // 1. Proactively refresh token every 15 minutes (long before 60-minute expiration)
    const intervalId = setInterval(keepSessionAlive, 15 * 60 * 1000);

    // 2. Refresh token immediately whenever the operator returns to the tab or unlocks their PC
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        keepSessionAlive();
      }
    };
    const handleWindowFocus = () => {
      keepSessionAlive();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const login = async (email, password, remember = true) => {
    setAuthError(null);
    try {
      if (remember) {
        await setPersistence(auth, browserLocalPersistence);
      } else {
        await setPersistence(auth, browserSessionPersistence);
      }
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;
      const formattedUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName:
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split('@')[0].toUpperCase() : 'ADMINISTRATOR'),
        raw: fbUser,
      };
      setUser(formattedUser);
      try {
        localStorage.setItem('athahar_user', JSON.stringify({
          uid: formattedUser.uid,
          email: formattedUser.email,
          displayName: formattedUser.displayName,
        }));
      } catch {
        // Ignore localStorage quota errors
      }
      return formattedUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem('athahar_user');
      localStorage.removeItem('atharva_user');
      setUser(null);
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out of Firebase Auth:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    setAuthError(null);
    return sendPasswordResetEmail(auth, email.trim());
  };

  const changePassword = async (newPassword) => {
    setAuthError(null);
    if (!auth.currentUser) throw new Error('No active user logged in.');
    return updatePassword(auth.currentUser, newPassword);
  };

  const changeEmail = async (newEmail) => {
    setAuthError(null);
    if (!auth.currentUser) throw new Error('No active user logged in.');
    if (typeof verifyBeforeUpdateEmail === 'function') {
      try {
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
        return { verifySent: true };
      } catch (err) {
        if (err.code === 'auth/operation-not-allowed') {
          await updateEmail(auth.currentUser, newEmail.trim());
          return { verifySent: false };
        }
        throw err;
      }
    } else {
      await updateEmail(auth.currentUser, newEmail.trim());
      return { verifySent: false };
    }
  };

  const createOperatorUser = async (email, password, displayName, role = 'Operator') => {
    setAuthError(null);
    const secondaryAppName = 'SecondaryAuthApp';
    const secondaryApp =
      getApps().find((a) => a.name === secondaryAppName) ||
      initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        password
      );
      const newFbUser = userCredential.user;

      if (displayName) {
        await updateProfile(newFbUser, { displayName });
      }

      await signOut(secondaryAuth);

      return {
        uid: newFbUser.uid,
        email: newFbUser.email,
        displayName: displayName || email.split('@')[0],
        role,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      await signOut(secondaryAuth).catch(() => {});
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        login,
        logout,
        resetPassword,
        changePassword,
        changeEmail,
        createOperatorUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
