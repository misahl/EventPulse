// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { isMock, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  loginUser, 
  signUpUser, 
  verifyOTPCode, 
  logoutUser, 
  getCurrentUserProfile,
  getSessionUser
} from '../firebase/auth';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  signUp: async () => {},
  verifyOTP: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state
  useEffect(() => {
    console.log('[AuthContext init] Syncing auth state. isMock =', isMock);
    if (isMock) {
      // Mock mode session restore
      const sessionUser = getSessionUser();
      console.log('[AuthContext init] Mock mode: Restoring sessionUser =', sessionUser);
      setTimeout(() => {
        if (sessionUser && sessionUser.status === 'active') {
          setUser(sessionUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }, 0);
    } else {
      // Real Firebase onAuthStateChanged
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[onAuthStateChanged] Triggered. firebaseUser =', firebaseUser ? firebaseUser.email : 'null');
        setLoading(true);
        if (firebaseUser) {
          try {
            console.log('[onAuthStateChanged] Fetching user profile from Firestore...');
            let profile = await getCurrentUserProfile(firebaseUser.uid);
            
            // Retry logic to handle Firestore write delay during signup
            if (!profile) {
              console.log('[onAuthStateChanged] Profile not found. Retrying in 800ms...');
              await new Promise(resolve => setTimeout(resolve, 800));
              profile = await getCurrentUserProfile(firebaseUser.uid);
            }
            if (!profile) {
              console.log('[onAuthStateChanged] Profile not found on second check. Retrying in 1500ms...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              profile = await getCurrentUserProfile(firebaseUser.uid);
            }

            console.log('[onAuthStateChanged] Profile fetched =', profile);

            if (profile && profile.status === 'active') {
              console.log('[onAuthStateChanged] Setting active user profile state.');
              setUser(profile);
            } else if (profile) {
              console.log('[onAuthStateChanged] Setting pending verification user profile state.');
              setUser(profile);
            } else {
              console.warn('[onAuthStateChanged] Profile document missing in Firestore. Clearing session.');
              setUser(null);
            }
          } catch (error) {
            console.error("[onAuthStateChanged] Error fetching user profile:", error);
            setUser(null);
          }
        } else {
          console.log('[onAuthStateChanged] User logged out. Clearing user state.');
          setUser(null);
        }
        setLoading(false);
        console.log('[onAuthStateChanged] Finished sync. Loading state set to false.');
      });
      return unsubscribe;
    }
  }, []);

  const login = async (email, password) => {
    console.log('[AuthContext login] Entering login pipeline for:', email);
    setLoading(true);
    try {
      const profile = await loginUser(email, password);
      console.log('[AuthContext login] Login success. profile =', profile);
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('[AuthContext login] Login failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (signUpFields) => {
    console.log('[AuthContext signUp] Entering signUp pipeline for:', signUpFields.email);
    setLoading(true);
    try {
      const profile = await signUpUser(signUpFields);
      console.log('[AuthContext signUp] SignUp success. profile =', profile);
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('[AuthContext signUp] SignUp failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const verifyOTP = async (email, code) => {
    console.log('[AuthContext verifyOTP] Entering OTP verification pipeline for:', email, 'code:', code);
    setLoading(true);
    try {
      const profile = await verifyOTPCode(email, code);
      console.log('[AuthContext verifyOTP] OTP verify success. profile =', profile);
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('[AuthContext verifyOTP] OTP verification failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[AuthContext logout] Entering logout pipeline...');
    setLoading(true);
    try {
      await logoutUser();
      console.log('[AuthContext logout] Logout success.');
      setUser(null);
    } catch (error) {
      console.error("[AuthContext logout] Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, verifyOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
