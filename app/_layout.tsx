// app/_layout.tsx
import React, { useEffect } from 'react';
import { SplashScreen } from 'expo-router';
import { useAuth, AuthProvider } from '../contexts/AuthContext'; // Adjust path if needed
import { Slot, useRouter, useSegments } from 'expo-router'; // Import useRouter and useSegments for routing

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments(); // Get the current route segments
  const router = useRouter(); // Get the router instance

  useEffect(() => {
    if (!loading) {
      // Hide the splash screen once authentication state is determined
      SplashScreen.hideAsync();

      const inAuthGroup = segments[0] === '(auth)'; // Check if current route is in the (auth) group

      if (user && !inAuthGroup) {
        // User is logged in and not in the auth group, redirect to tabs (home)
        router.replace('/(tabs)/home'); // Or just '/(tabs)' if your tabs layout redirects to a default
      } else if (!user && inAuthGroup) {
        // User is not logged in and is already in the auth group, stay there (e.g., on login/register screen)
        // No redirect needed, as they are already in the correct place.
      } else if (!user && !inAuthGroup) {
        // User is not logged in and is NOT in the auth group (e.g., trying to access a protected route directly)
        router.replace('/sign-in'); // Redirect to login
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    // Return null or a custom loading component here.
    // SplashScreen is preventing auto-hide, so nothing visible is needed.
    return null;
  }

  // Slot renders the child routes
  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}