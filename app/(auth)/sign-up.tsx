// app/(auth)/register.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, Auth, UserCredential } from 'firebase/auth'; // Import UserCredential
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../../firbase.config'; // Adjust path and import 'db'
import { useRouter } from 'expo-router';

const RegisterScreen = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>(''); // New state for username
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // New state for phone number
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    try {
      console.log("Attempting REGISTRATION with email:", email.trim(), "and password length:", password.length);

      // 1. Create user with email and password
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth as Auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Save additional user details to Firestore
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          username: username.trim(), // Save username
          phoneNumber: phoneNumber.trim(), // Save phone number
          createdAt: new Date(),
        });
        console.log("User profile saved to Firestore successfully!");
      }

      console.log("User registered successfully!");
      // Optionally navigate or show success message
      // router.push('/home'); // Example navigation
    } catch (error: any) {
      console.error("Registration Error:", error.message);
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
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
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <Button title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} />
      {loading && <ActivityIndicator style={styles.activityIndicator} size="small" color="#0000ff" />}
      <TouchableOpacity onPress={() => router.push('/sign-in')}>
        <Text style={styles.switchText}>Already have an account? Login here.</Text>
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

export default RegisterScreen;