// src/firebase/auth.js
import { isMock, auth, db, firebaseConfig } from './config';
import { initializeApp } from 'firebase/app';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  getAuth
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
  const data = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(SESSION_USER_KEY);
  return data ? JSON.parse(data) : null;
}

// Helper to set active session user
function setSessionUser(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_USER_KEY);
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
      console.error('[Firebase Auth Login Error]', firebaseErr.code, firebaseErr.message);
      if (firebaseErr.code === 'auth/user-not-found') {
        throw new Error('No account found for this email. Please check your email or click Sign Up!');
      } else if (firebaseErr.code === 'auth/wrong-password') {
        throw new Error('Incorrect password for this account. Please re-enter your password or sign up again.');
      } else if (firebaseErr.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. If you forgot your password, click "Sign Up" to register or re-activate your account!');
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

/**
 * Send password reset email
 */
export async function resetPasswordUser(email) {
  if (isMock) {
    return true;
  } else {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      console.error('[Password Reset Error]', err.code, err.message);
      if (err.code === 'auth/user-not-found') {
        throw new Error('No account found for this email address.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please provide a valid email address.');
      }
      throw new Error(err.message || 'Failed to send password reset email.');
    }
  }
}

/**
 * Update an organizer's profile information (including optional password update).
 */
export async function updateOrganizerAccount(uid, { name, email, department, newPassword }) {
  if (!uid && !email) throw new Error('User ID or email is required');

  if (isMock) {
    const users = getMockUsers();
    const index = users.findIndex(u => u.uid === uid || u.email === email);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        name: name || users[index].name,
        email: email || users[index].email,
        department: department || users[index].department,
        password: newPassword ? newPassword : users[index].password
      };
      saveMockUsers(users);
      return users[index];
    }
    return { uid, name, email, department };
  } else {
    try {
      const targetUid = uid || email;
      const userRef = doc(db, 'users', targetUid);
      const updatedFields = {};
      if (name) updatedFields.name = name;
      if (email) updatedFields.email = email;
      if (department) updatedFields.department = department;

      if (newPassword) {
        updatedFields.passwordUpdated = new Date().toISOString();
        try {
          await sendPasswordResetEmail(auth, email);
        } catch (resetErr) {
          console.warn('[Password Reset Email Warning]', resetErr);
        }
      }

      await updateDoc(userRef, updatedFields);
      return { uid: targetUid, ...updatedFields };
    } catch (err) {
      console.error('[updateOrganizerAccount Error]', err);
      throw new Error(err.message || 'Failed to update organizer profile.');
    }
  }
}

/**
 * Delete an organizer account.
 */
export async function deleteOrganizerAccount(uid, email = null) {
  if (!uid && !email) throw new Error('User ID or Email required to delete organizer.');

  if (isMock) {
    let users = getMockUsers();
    users = users.filter(u => u.uid !== uid && u.email !== email);
    saveMockUsers(users);
    return true;
  } else {
    try {
      if (uid) {
        await deleteDoc(doc(db, 'users', uid));
      }
      return true;
    } catch (err) {
      console.error('[deleteOrganizerAccount Error]', err);
      throw new Error(err.message || 'Failed to delete organizer account.');
    }
  }
}


/**
 * Admin helper to register an organizer account.
 */
export async function createOrganizerAccount({ name, email, password, department }) {
  if (!email || !password || !name) {
    throw new Error('Name, Email, and Password are required to create an organizer account.');
  }

  if (isMock) {
    const users = getMockUsers();
    if (users.some(u => u.email === email)) {
      throw new Error('An account with this email address already exists.');
    }

    const newOrganizer = {
      uid: 'org_' + Date.now(),
      name,
      email,
      password,
      role: 'organizer',
      department: department || 'General',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    users.push(newOrganizer);
    saveMockUsers(users);
    return newOrganizer;
  } else {
    // Real Firebase: Create user using secondary app instance so primary admin auth session is preserved
    try {
      const secondaryAppName = 'SecondaryAuth_' + Date.now();
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: name });

      const userProfile = {
        uid: firebaseUser.uid,
        email,
        name,
        role: 'organizer',
        department: department || 'General',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Write user document to Firestore using main db instance
      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);

      // Clean up secondary auth session
      await signOut(secondaryAuth);

      return userProfile;
    } catch (firebaseErr) {
      console.error('[Create Organizer Error]', firebaseErr.code, firebaseErr.message);
      if (firebaseErr.code === 'auth/email-already-in-use') {
        throw new Error('An organizer account with this email address already exists.');
      } else if (firebaseErr.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      }
      throw new Error(firebaseErr.message || 'Failed to create organizer account.');
    }
  }
}

/**
 * Fetch all registered organizers & faculty.
 */
export async function getOrganizersList() {
  if (isMock) {
    const users = getMockUsers();
    return users.filter(u => u.role === 'organizer' || u.role === 'admin');
  } else {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['organizer', 'admin']));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data());
    } catch (err) {
      console.error('[getOrganizersList Error]', err);
      return [];
    }
  }
}


