import React, { useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { Client, Account } from 'appwrite';

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1') // Appwrite endpoint
  .setProject('6877dfcc000a196abe06'); // Your project ID

const account = new Account(client);

const AppwriteTest = () => {
  useEffect(() => {
    // Test the connection to Appwrite
    account.get()
      .then((res) => {
        console.log('Appwrite response:', res);
        Alert.alert('Appwrite connected ✅');
      })
      .catch((err) => {
        console.error('Appwrite error:', err);
        Alert.alert('Appwrite connection failed ❌', err.message || 'Unknown error');
      });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Testing Appwrite connection...</Text>
    </View>
  );
};

export default AppwriteTest;
