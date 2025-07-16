// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../firbase.config'; // Adjust path if needed (relative to root)
                                             // Make sure 'db' is exported from firebase.config

// Define the shape of the UserProfile stored in Firestore
interface UserProfile {
  uid: string;
  email: string | null;
  username: string | null;
  phoneNumber: string | null;
  // Add other profile fields as needed that you save to Firestore
}

// Define the shape of the AuthContext value
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null; // Add userProfile to the context type
  loading: boolean;
}

// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // New state for user profile
  const [loading, setLoading] = useState<boolean>(true); // To indicate if auth state is still loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser: User | null) => {
      setUser(firebaseUser); // Set the Firebase Auth user

      if (firebaseUser) {
        // User is logged in, now fetch their additional profile data from Firestore
        const docRef = doc(db, "users", firebaseUser.uid);
        try {
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: profileData.username || null,
              phoneNumber: profileData.phoneNumber || null,
              // Map other fields from Firestore as needed
            });
          } else {
            // User exists in Auth but no profile in Firestore (e.g., just registered)
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid);
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: null, // Default to null if not found
              phoneNumber: null, // Default to null if not found
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Handle error, maybe set userProfile to null or a default
          setUserProfile(null);
        }
      } else {
        // No user logged in, clear user profile
        setUserProfile(null);
      }
      setLoading(false); // Authentication state and profile fetch has been determined
    });

    // Clean up the subscription when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  const value: AuthContextType = {
    user,
    userProfile, // Include userProfile in the context value
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Do not render children until auth state and profile data is determined to prevent flickers */}
      {loading ? null : children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily access auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};