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

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Real Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName ||
            (firebaseUser.email ? firebaseUser.email.split('@')[0].toUpperCase() : 'ADMINISTRATOR'),
          raw: firebaseUser,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      return formattedUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('atharva_user');
      localStorage.removeItem('athahar_user');
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
