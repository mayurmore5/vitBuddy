import { View, Text } from 'react-native';
import { SplashScreen, Stack, useRouter } from "expo-router";
import { useEffect } from 'react';

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

  useEffect(() => {
    if (loading) {
      return;
    }
    SplashScreen.hideAsync();

    if (user) {
      router.replace('/home');
    } else {
      router.replace('/');
    }
  }, [user, loading]); 
  return (
    
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      
      
    </Stack>
  
  );
};

export default RootLayout;