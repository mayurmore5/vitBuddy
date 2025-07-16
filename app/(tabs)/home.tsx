import React, { useState } from 'react';
import { View, Button, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Client, Storage, ID } from 'appwrite';

// Initialize Appwrite
const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1') // Your Appwrite endpoint
  .setProject('6877dfcc000a196abe06'); // Your project ID

const storage = new Storage(client);

const UploadImage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadToAppwrite = async () => {
    if (!image) return Alert.alert('No image selected');

    try {
      setUploading(true);

      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], 'uploaded-image.jpg', { type: blob.type });

      const result = await storage.createFile(
        '6877e03e00159846b001', // Your bucket ID
        ID.unique(),
        file
      );

      Alert.alert('Upload Success', `File ID: ${result.$id}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Button title="Pick an Image" onPress={pickImage} />

      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: 200, height: 200, marginVertical: 20, borderRadius: 10 }}
        />
      )}

      {uploading ? (
        <ActivityIndicator size="large" />
      ) : (
        image && <Button title="Upload to Appwrite" onPress={uploadToAppwrite} />
      )}
    </View>
  );
};

export default UploadImage;
