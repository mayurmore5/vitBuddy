import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, Auth } from 'firebase/auth'; // ONLY import Auth, not getReactNativePersistence
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyC4B5abOjGCc7cqhVtsUUiMKEpKboED7CE",
  authDomain: "login-app-20d6c.firebaseapp.com",
  projectId: "login-app-20d6c",
  storageBucket: "login-app-20d6c.appspot.com",
  messagingSenderId: "206558100684",
  appId: "1:206558100684:web:346692865ef555b40f9669",
  measurementId: "G-JJVD7RWDWC"
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth WITHOUT specifying persistence
// This defaults to session persistence (browser session), which means
// no persistence for native mobile apps.
const auth: Auth = initializeAuth(app);
const db = getFirestore(app);
export { app, auth, db };