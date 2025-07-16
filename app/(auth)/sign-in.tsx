import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { auth } from '../../firbase.config';
import { useRouter } from 'expo-router';

const LoginScreen = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // --- ADD THIS CONSOLE.LOG ---
      console.log("Attempting login with email:", email.trim(), "and password length:", password.length);
      // You can also add .trim() here to remove accidental spaces
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
});

export default LoginScreen;