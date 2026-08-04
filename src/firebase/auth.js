// src/firebase/auth.js
import { isMock, auth, db } from './config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Mock database key names in localStorage
const MOCK_USERS_KEY = 'eventpulse_mock_users';
const SESSION_USER_KEY = 'eventpulse_session_user';

// Helper to get mock users from localStorage
function getMockUsers() {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(MOCK_USERS_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper to save mock users to localStorage
function saveMockUsers(users) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

// Helper to get active session user
export function getSessionUser() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(SESSION_USER_KEY);
  return data ? JSON.parse(data) : null;
}

// Helper to set active session user
function setSessionUser(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_USER_KEY);
  }
}

/**
 * Helper to trigger server-side OTP email delivery via API route.
 */
async function triggerOTPEmail(email, otpCode) {
  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode }),
    });
    const data = await res.json();
    
    // Add visual flag to window session for the visual indicator
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('eventpulse_otp_fallback', data.fallback ? 'true' : 'false');
    }
    
    if (data.fallback) {
      console.log(`[MOCK MAILER DETECTED] OTP sent to server console: ${otpCode}`);
    } else {
      console.log(`[REAL MAILER DETECTED] OTP delivered via Resend API`);
    }
  } catch (err) {
    console.error('Failed to invoke OTP email trigger api:', err);
  }
}

/**
 * Sign up a new user.
 * Role can be: 'student', 'organizer', 'admin'
 */
export async function signUpUser({ email, password, name, usn, role, department, year, interests }) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
  
  if (isMock) {
    const users = getMockUsers();
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists');
    }

    const newUser = {
      uid: 'mock_uid_' + Math.random().toString(36).substr(2, 9),
      email,
      name,
      usn: usn || '',
      role: role || 'student',
      department: department || '',
      year: year || '',
      interests: interests || [],
      status: 'pending', // Pending OTP activation
      otpCode,
      password // stored only for mock checking
    };

    users.push(newUser);
    saveMockUsers(users);

    // Print OTP code to console for hackathon dev ease
    console.log(`[MOCK AUTH] Created account for ${email}. Activation OTP is: ${otpCode}`);
    
    // Trigger Server API to either send real email or log it to the server console
    await triggerOTPEmail(email, otpCode);

    // Set transient session user
    setSessionUser(newUser);
    return newUser;
  } else {
    // Real Firebase Auth
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      await updateProfile(firebaseUser, { displayName: name });

      const userProfile = {
        uid: firebaseUser.uid,
        email,
        name,
        usn: usn || '',
        role: role || 'student',
        department: department || '',
        year: year || '',
        interests: interests || [],
        status: 'pending',
        otpCode,
        createdAt: new Date().toISOString()
      };

      // Save profile in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      
      console.log(`[REAL FIREBASE AUTH] Created account for ${email}. Activation OTP is: ${otpCode}`);
      
      // Trigger Server API to deliver the real email (or log to server console as fallback)
      await triggerOTPEmail(email, otpCode);

      return userProfile;
    } catch (firebaseErr) {
      if (firebaseErr.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please click "Sign In" instead!');
      } else if (firebaseErr.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      } else if (firebaseErr.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(firebaseErr.message || 'Registration failed.');
    }
  }
}

/**
 * Verifies the 6-digit OTP code to activate the account.
 */
export async function verifyOTPCode(email, code) {
  if (isMock) {
    const users = getMockUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = users[userIndex];
    if (user.otpCode !== code) {
      throw new Error('Invalid verification code');
    }

    user.status = 'active';
    users[userIndex] = user;
    saveMockUsers(users);
    
    // Update active session user
    setSessionUser(user);
    return user;
  } else {
    // Real Firebase Auth: fetch profile, verify OTP, update status
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error('No user is currently signed in');
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found in database');
    }

    const profileData = userDoc.data();
    if (profileData.otpCode !== code) {
      throw new Error('Invalid verification code');
    }

    // Update status to active
    await updateDoc(userDocRef, {
      status: 'active'
    });

    return {
      ...profileData,
      status: 'active'
    };
  }
}

/**
 * Sign in user.
 */
export async function loginUser(email, password) {
  if (isMock) {
    const users = getMockUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    setSessionUser(user);
    return user;
  } else {
    // Real Firebase Auth
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Fetch profile
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Fallback default profile if not present
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'Campus User',
          role: 'student',
          status: 'active'
        };
      }

      return userDoc.data();
    } catch (firebaseErr) {
      if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials or sign up!');
      }
      throw new Error(firebaseErr.message || 'Login failed.');
    }
  }
}

/**
 * Log out user.
 */
export async function logoutUser() {
  if (isMock) {
    setSessionUser(null);
    return true;
  } else {
    await signOut(auth);
    return true;
  }
}

/**
 * Gets the current active user profile.
 */
export async function getCurrentUserProfile(firebaseUid = null) {
  if (isMock) {
    return getSessionUser();
  } else {
    const uid = firebaseUid || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return null;
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  }
}
