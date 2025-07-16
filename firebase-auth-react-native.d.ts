// firebase-auth-react-native.d.ts
declare module 'firebase/auth/react-native' {
    import { Persistence } from 'firebase/auth';
    import { ReactNativeAsyncStorage } from '@react-native-async-storage/async-storage'; // Assuming this is the correct import
  
    export function getReactNativePersistence(asyncStorage: typeof ReactNativeAsyncStorage): Persistence;
  }