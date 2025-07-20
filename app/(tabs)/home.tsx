import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, LatLng, MapPressEvent } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// Appwrite SDK imports (for Storage)
import { Client, Storage, ID } from 'appwrite';
// Firebase Firestore imports (for item metadata)
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  doc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firbase.config';

// Define interfaces
interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  fileId: string | null;
  posterUid: string;
  posterEmail: string | null;
  createdAt: Timestamp;
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// --- Appwrite Configuration ---
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6877ceb900174de77c13';
const APPWRITE_BUCKET_ID = '6877cef2001785f62b03';

// Initialize Appwrite Client and Services
const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const appwriteStorage = new Storage(appwriteClient);

const MapScreen = () => {
  const { user, loading: authLoading } = useAuth();

  const [region, setRegion] = useState({
    latitude: 19.0760,
    longitude: 72.8777,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<{ uri: string; type: string; fileName: string } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [fetchingItems, setFetchingItems] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [itemDetailModalVisible, setItemDetailModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- NEW Search States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Reference to the MapView component
  const mapRef = useRef<MapView>(null);

  // --- Fetch items from Firestore in real-time ---
  useEffect(() => {
    if (!db) {
      console.error("Firestore database (db) is not initialized.");
      setFetchingItems(false);
      return;
    }

    const q = query(collection(db, 'lostFoundItems'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: LostFoundItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as LostFoundItem);
      });
      setItems(fetchedItems);
      setFetchingItems(false);
    }, (error) => {
      console.error("Error fetching lost/found items from Firestore:", error);
      Alert.alert("Error", "Failed to load lost/found items.");
      setFetchingItems(false);
    });

    return () => unsubscribe();
  }, [db]);

  // --- NEW: Handle search functionality ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Invalid Search", "Please enter a place name or address.");
      return;
    }

    setIsSearching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location is required for searching.');
        setIsSearching(false);
        return;
      }

      const geocodedLocation = await Location.geocodeAsync(searchQuery);

      if (geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };

        // Animate map to the new location
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }

        // Select the location and open the modal
        setSelectedLocation({ latitude, longitude });
        setModalVisible(true);
      } else {
        Alert.alert("Location Not Found", "Could not find a location for your search query.");
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
      Alert.alert("Search Error", "An error occurred while searching for the location.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- Handle long press on map to add a new item ---
  const handleMapLongPress = (event: MapPressEvent) => {
    if (!user) {
      Alert.alert("Login Required", "You must be logged in to post a lost or found item.");
      return;
    }
    setSelectedLocation(event.nativeEvent.coordinate);
    setModalVisible(true);
  };

  // --- Image Picker Functionality ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageAsset({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `image_${Date.now()}.jpg`,
      });
      setImage(asset.uri);
    }
  };

  /**
   * Uploads an image to Appwrite Storage.
   */
  const uploadImageToAppwrite = async (asset: { uri: string; type: string; fileName: string }, uid: string) => {
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const fileToUpload = Object.defineProperty(blob, 'name', {
        value: asset.fileName,
        writable: false,
      });
      Object.defineProperty(fileToUpload, 'lastModified', {
        value: new Date().getTime(),
        writable: false,
      });

      const file = await appwriteStorage.createFile(
        APPWRITE_BUCKET_ID,
        ID.unique(),
        fileToUpload as File,
        [`read("user:${uid}")`, `write("user:${uid}")`]
      );

      const imageUrl = appwriteStorage.getFilePreview(APPWRITE_BUCKET_ID, file.$id).toString();
      return { imageUrl, fileId: file.$id };
    } catch (error: any) {
      console.error("Error uploading image to Appwrite:", error);
      Alert.alert("Upload Error", `Failed to upload image: ${error.message}`);
      return null;
    }
  };

  // --- Save new item to Firestore ---
  const handleSaveItem = async () => {
    if (!user || !selectedLocation || !itemTitle.trim() || !itemDescription.trim()) {
      Alert.alert("Missing Information", "Please fill in all details and select a location.");
      return;
    }

    setUploading(true);
    let imageUrl = null;
    let fileId = null;

    try {
      if (imageAsset) {
        const uploadResult = await uploadImageToAppwrite(imageAsset, user.uid);
        if (uploadResult) {
          imageUrl = uploadResult.imageUrl;
          fileId = uploadResult.fileId;
        } else {
          setUploading(false);
          return;
        }
      }

      const newItem = {
        title: itemTitle.trim(),
        description: itemDescription.trim(),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        imageUrl: imageUrl,
        fileId: fileId,
        posterUid: user.uid,
        posterEmail: user.email,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'lostFoundItems'), newItem);
      Alert.alert("Success", "Item posted successfully!");
      resetForm();
    } catch (error: any) {
      console.error("Error saving item to Firestore:", error);
      Alert.alert("Error", `Failed to post item: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // --- Delete item from Firestore and Appwrite Storage ---
  const handleDeleteItem = async () => {
    if (!selectedItem || !user || user.uid !== selectedItem.posterUid) {
      Alert.alert("Permission Denied", "You can only delete items you have posted.");
      return;
    }

    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this item? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (selectedItem.fileId) {
                try {
                  await appwriteStorage.deleteFile(APPWRITE_BUCKET_ID, selectedItem.fileId);
                  console.log("Image deleted from Appwrite Storage:", selectedItem.fileId);
                } catch (storageError: any) {
                  console.warn("Could not delete image from Appwrite Storage:", storageError);
                }
              }

              await deleteDoc(doc(db, 'lostFoundItems', selectedItem.id));
              Alert.alert("Deleted", "Item successfully removed.");
              setItemDetailModalVisible(false);
              setSelectedItem(null);
            } catch (error: any) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", `Failed to delete item: ${error.message}`);
            } finally {
              setIsDeleting(false);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // --- Reset form fields and close modal ---
  const resetForm = () => {
    setModalVisible(false);
    setSelectedLocation(null);
    setItemTitle('');
    setItemDescription('');
    setImage(null);
    setImageAsset(null);
    setSearchQuery(''); // Clear search query on form reset
  };

  // --- Handle marker press to show item details ---
  const handleMarkerPress = (item: LostFoundItem) => {
    setSelectedItem(item);
    setItemDetailModalVisible(true);
  };

  // --- Initial loading state for Auth and Firestore data fetching ---
  if (authLoading || fetchingItems) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading map and items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={handleMapLongPress}
        showsUserLocation={true}
        onRegionChangeComplete={setRegion}
      >
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="New Item Location"
            pinColor="blue"
          />
        )}

        {items.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.title}
            description={item.description}
            onPress={() => handleMarkerPress(item)}
            pinColor="red"
          />
        ))}
      </MapView>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a place..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Post Lost or Found Item</Text>
            <TextInput
              style={styles.input}
              placeholder="Item Title (e.g., Lost Keys)"
              value={itemTitle}
              onChangeText={setItemTitle}
            />
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Description (e.g., Black keys with red lanyard)"
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline
            />
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Text style={styles.imagePickerButtonText}>Pick an Image</Text>
            </TouchableOpacity>
            {image && <Image source={{ uri: image }} style={styles.previewImage} />}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetForm}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, uploading ? styles.disabledButton : styles.saveButton]}
                onPress={handleSaveItem}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Item</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={itemDetailModalVisible}
        onRequestClose={() => setItemDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <ScrollView contentContainerStyle={styles.itemDetailScrollContent}>
                <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                {selectedItem.imageUrl && (
                  <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} />
                )}
                <Text style={styles.detailText}>Description: {selectedItem.description}</Text>
                <Text style={styles.detailText}>Posted by: {selectedItem.posterEmail || 'Anonymous'}</Text>
                <Text style={styles.detailText}>
                  Posted on: {selectedItem.createdAt.toDate().toLocaleDateString()} at{' '}
                  {selectedItem.createdAt.toDate().toLocaleTimeString()}
                </Text>

                {user && selectedItem.posterUid === user.uid && (
                  <TouchableOpacity
                    style={[styles.button, styles.deleteButton, isDeleting && styles.disabledButton]}
                    onPress={handleDeleteItem}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Delete Item</Text>
                    )}
                  </TouchableOpacity>
                )}

                {user && selectedItem.posterUid !== user.uid && (
                  <TouchableOpacity
                    style={[styles.button, styles.chatButton]}
                    // TODO: Navigate to ChatScreen with item details
                    onPress={() => Alert.alert("Navigate to Chat", "This button will open the chat screen.")}
                  >
                    <Text style={styles.buttonText}>Message Poster</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setItemDetailModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
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
    fontSize: 16,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  imagePickerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetailScrollContent: {
    alignItems: 'center',
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    textAlign: 'center',
  },
  chatButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    width: '90%',
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MapScreen;