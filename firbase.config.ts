import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Initialize Firebase Auth with AsyncStorage persistence
// Initialize auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
export { app, auth, db };