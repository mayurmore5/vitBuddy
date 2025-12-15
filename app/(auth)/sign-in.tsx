import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword, Auth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firbase.config';
import { useRouter } from 'expo-router';
// New imports for Google Sign-In
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Replace with your Web Client ID from the Firebase Console
// It is highly recommended to use environment variables for this.
const GOOGLE_WEB_CLIENT_ID = '206558100684-smc555mcd3gdtecvvb5lgm2hfckanp44.apps.googleusercontent.com';

const LoginScreen = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // --- Google Sign-In Logic ---
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    // Explicitly set the redirect URI to avoid mismatches
    // For Expo Go, this might still be tricky, but logging it helps.
  });

  useEffect(() => {
    if (request) {
      console.log("Google Auth Request Ready. Redirect URI:", request.redirectUri);
    }
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      // Use the Firebase sign-in method with the Google credential
      signInWithCredential(auth, credential)
        .then(() => {
          console.log("Google user signed in successfully!");
          router.push('/home');
        })
        .catch((error) => {
          console.error("Firebase Sign-In with Google failed:", error.message);
          Alert.alert("Google Sign-In Failed", error.message);
        });
    } else if (response?.type === 'error') {
      console.error("Google Sign-In Error:", response.error);
      console.error("Google Sign-In Error Code:", response.error?.code);
      console.error("Google Sign-In Error Description:", response.error?.description);
      Alert.alert("Google Sign-In Failed", `Error: ${response.error?.code || 'Unknown'} - ${response.error?.description || 'Check console for details'}`);
    }
  }, [response]);

  // --- Existing Email/Password Logic ---
  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth as Auth, email.trim(), password);
      console.log("User logged in successfully!");
      router.push('/home');
    } catch (error: any) {
      console.error("Login Error:", error.message);
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />
      {loading && <ActivityIndicator style={styles.activityIndicator} size="small" color="#0000ff" />}

      <Text style={styles.divider}>OR</Text>

      {/* NEW: Google Sign-In Button */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={() => {
          promptAsync();
        }}
        disabled={!request} // Disable button if the auth request isn't ready
      >
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/sign-up')}>
        <Text style={styles.switchText}>Don't have an account? Register here.</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  activityIndicator: {
    marginTop: 10,
  },
  switchText: {
    marginTop: 20,
    color: '#007AFF',
    fontSize: 16,
  },
  divider: {
    marginVertical: 20,
    fontSize: 16,
    color: '#aaa',
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;