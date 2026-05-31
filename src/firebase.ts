import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is properly configured
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'undefined' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'undefined'
);

if (!isFirebaseConfigured) {
  console.warn('[Firebase] Not configured - running in demo mode. Add Firebase credentials to .env to enable full features.');
}

export const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isFirebaseConfigured ? getAuth(firebaseApp!) : null;
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

export const db = isFirebaseConfigured ? initializeFirestore(firebaseApp!, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}) : null;

export const firebaseStorage = isFirebaseConfigured ? getStorage(firebaseApp!) : null;
