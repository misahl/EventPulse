// src/firebase/config.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Determine if we should use Mock fallback (i.e. environment variables are not set)
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.authDomain;

const isMock = !isFirebaseConfigured;

let app;
let db = null;
let auth = null;

if (!isMock) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Log active mode to console on startup
    if (typeof window !== 'undefined') {
      console.log("%c🔥 Connected to live Firebase", "color: #10b981; font-weight: bold; font-size: 14px;");
    } else {
      console.log("🔥 Connected to live Firebase");
    }
  } catch (error) {
    console.error("Firebase initialization failed, falling back to mock mode:", error);
  }
} else {
  // Log mock mode to console on startup
  if (typeof window !== 'undefined') {
    console.log("%c⚠️ Running in MOCK mode", "color: #f59e0b; font-weight: bold; font-size: 14px;");
  } else {
    console.log("⚠️ Running in MOCK mode");
  }
}

export { app, db, auth, isMock, firebaseConfig };
