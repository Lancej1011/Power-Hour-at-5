import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Firebase configuration - these will be set from environment variables
const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Check if Firebase is configured
const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase app
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Configure auth for Electron environment
    if (typeof window !== 'undefined') {
      const isElectron = window.location.protocol === 'file:' ||
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol.startsWith('app:') ||
                        window.location.protocol.startsWith('electron:') ||
                        (typeof window.require !== 'undefined'); // Additional Electron detection

      if (isElectron) {
        console.log('🔧 Configuring Firebase Auth for Electron environment');
        console.log('🔧 Current location:', window.location.href);
        console.log('🔧 Protocol:', window.location.protocol);
        console.log('🔧 Hostname:', window.location.hostname);

        // For Electron apps, we need to disable domain verification
        // since file:// and app:// protocols aren't supported by Firebase
        try {
          // Disable app verification for Electron
          auth.settings.appVerificationDisabledForTesting = true;

          // Use device language
          auth.useDeviceLanguage();

          console.log('✅ Firebase Auth configured for Electron');
        } catch (error) {
          console.warn('⚠️ Could not fully configure Firebase Auth for Electron:', error);
        }
      }
    }

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
  }
} else {
  console.warn('⚠️ Firebase not configured - using local storage only');
}

// Export Firebase instances
export { app, db, auth };

// Export configuration status
export { isFirebaseConfigured };

// Export types for use in other files
export type { FirebaseConfig };
