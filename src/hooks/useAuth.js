// Custom hook for managing authentication state
import { useState, useEffect } from 'react';
import { auth, googleProvider } from '../utils/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import { db } from '../utils/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Custom hook for authentication
 * @returns {Object} Authentication state and methods
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Create or update user profile in Firestore
   * @param {Object} firebaseUser - Firebase user object
   */
  const createUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return null;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    const userData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      status: 'online',
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp()
    };

    if (!userDoc.exists()) {
      await setDoc(userRef, userData);
    } else {
      await setDoc(userRef, { ...userData }, { merge: true });
    }

    return { id: firebaseUser.uid, ...userData };
  };

  /**
   * Sign in with Google popup
   */
  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userProfile = await createUserProfile(result.user);
      setUser(userProfile);
      toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS);
      return userProfile;
    } catch (error) {
      console.error('Google sign in error:', error);
      setError(error.message);
      toast.error(ERROR_MESSAGES.AUTH_FAILED);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out user
   */
  const logout = async () => {
    setLoading(true);
    
    try {
      // Update user status to offline before signing out
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { 
          status: 'offline',
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
      
      await signOut(auth);
      setUser(null);
      toast.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          const userProfile = await createUserProfile(firebaseUser);
          setUser(userProfile);
        } catch (error) {
          console.error('Error creating user profile:', error);
          setError(error.message);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Handle redirect result (for mobile/redirect flow)
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect sign in error:', error);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
    isAuthenticated: !!user
  };
};