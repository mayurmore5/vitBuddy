import { View, Text } from 'react-native';
import { SplashScreen, Stack, useRouter, usePathname } from "expo-router";
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';



// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
};

const RootLayoutNav = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only proceed when auth state is determined
    if (!loading) {
      SplashScreen.hideAsync();
      setIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!isReady) return;

    // Only navigate if we're not already on the desired screen
    if (user) {
      if (!pathname?.startsWith('/(tabs)')) {
        router.replace('/(tabs)/home');
      }
    } else if (pathname !== '/') {
      router.replace('/');
    }
  }, [user, isReady, router]);

  // Show nothing while loading
  if (loading || !isReady) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default RootLayout;