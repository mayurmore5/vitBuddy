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
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, LatLng, MapPressEvent } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Client, Storage, ID } from 'appwrite';
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
  setDoc,
  where,
  or,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firbase.config';

// Define interfaces (assuming these are in a separate file or at the top)
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

interface GeoapifyFeature {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

interface ChatMessage {
  id: string;
  senderUid: string;
  senderEmail: string | null;
  receiverUid: string;
  text: string;
  createdAt: Timestamp;
}

interface ChatDetails {
  itemId: string;
  itemTitle: string;
  posterUid: string;
  posterEmail: string | null;
  otherParticipantUid: string;
  otherParticipantEmail: string | null;
  otherParticipantUsername: string | null;
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0535;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6877ceb900174de77c13';
const APPWRITE_BUCKET_ID = '6877cef2001785f62b03';

const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const appwriteStorage = new Storage(appwriteClient);

const GEOAPIFY_API_KEY = 'e2ffdb8a5b2b41d38b49e0c74dd18c12';
const GEOAPIFY_AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

// Function to get a user's display name from a hypothetical 'users' collection
const getUserDisplayName = async (uid: string) => {
  if (!db || !uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists() && userDocSnap.data().username) {
      return userDocSnap.data().username;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user display name:", error);
    return null;
  }
};

const MapScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();

  const [region, setRegion] = useState({
    latitude: 12.84,
    longitude: 80.15,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoapifyFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const mapRef = useRef<MapView>(null);

  // --- NEW: Chat-related state, moved from ChatScreen ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesScrollViewRef = useRef<ScrollView>(null);
  const [currentChat, setCurrentChat] = useState<ChatDetails | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  // --- END NEW ---

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

  // --- NEW: Chat Message Listener, moved from ChatScreen ---
  useEffect(() => {
    if (!db || !currentChat || !user) {
      setMessages([]);
      return;
    }

    const participants = [user.uid, currentChat.otherParticipantUid].sort();
    const chatDocId = `${currentChat.itemId}_${participants[0]}_${participants[1]}`;

    const chatMessagesRef = collection(db, 'chats', chatDocId, 'messages');
    const q = query(chatMessagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedMessages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
        });
        setMessages(fetchedMessages);
        setTimeout(() => {
          messagesScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error("Error fetching chat messages:", error);
        Alert.alert("Chat Error", "Failed to load chat messages.");
      }
    );

    return () => unsubscribe();
  }, [db, currentChat, user]);
  // --- END NEW ---

  const handleAutocomplete = async (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `${GEOAPIFY_AUTOCOMPLETE_URL}?text=${encodeURIComponent(text)}&apiKey=${GEOAPIFY_API_KEY}`;
        const response = await fetch(url);
        const data = (await response.json()) as GeoapifyResponse;
        if (data.features && data.features.length > 0) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSuggestionPress = (suggestion: GeoapifyFeature) => {
    const { lat, lon } = suggestion.properties;
    const newRegion = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
    setSearchQuery(suggestion.properties.formatted);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedLocation({ latitude: lat, longitude: lon });
    setModalVisible(true);
  };

  const handleMapLongPress = (event: MapPressEvent) => {
    if (!user) {
      Alert.alert("Login Required", "You must be logged in to post a lost or found item.");
      return;
    }
    setSelectedLocation(event.nativeEvent.coordinate);
    setModalVisible(true);
  };

  // --- NEW: handleMessagePoster now opens a modal on THIS screen ---
  const handleMessagePoster = async (item: LostFoundItem) => {
    if (!user) {
      Alert.alert("Login Required", "You must be logged in to message the poster.");
      return;
    }
    
    if (item.posterUid === user.uid) {
      Alert.alert("Invalid Action", "You cannot message yourself.");
      return;
    }

    setSelectedItem(null); // Close the item detail modal first
    setItemDetailModalVisible(false);

    const otherParticipantUsername = await getUserDisplayName(item.posterUid);

    // Set the current chat details and open the chat modal
    setCurrentChat({
      itemId: item.id,
      itemTitle: item.title,
      posterUid: item.posterUid, // This is the person who posted the item
      posterEmail: item.posterEmail,
      otherParticipantUid: item.posterUid,
      otherParticipantEmail: item.posterEmail,
      otherParticipantUsername: otherParticipantUsername,
    });
    setChatModalVisible(true);
  };

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

  const handleSaveItem = async () => {
    if (!user || !selectedLocation || !itemTitle.trim() || !itemDescription.trim()) {
      Alert.alert("Missing Information", "Please log in and fill in all details.");
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

  const handleDeleteItem = async () => {
    if (!selectedItem || !user || user.uid !== selectedItem.posterUid) {
      Alert.alert("Permission Denied", "You can only delete items you have posted.");
      return;
    }
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this item? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
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

  const resetForm = () => {
    setModalVisible(false);
    setSelectedLocation(null);
    setItemTitle('');
    setItemDescription('');
    setImage(null);
    setImageAsset(null);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleMarkerPress = (item: LostFoundItem) => {
    setSelectedItem(item);
    setItemDetailModalVisible(true);
  };

  // --- NEW: handleSendMessage, moved from ChatScreen ---
  const handleSendMessage = async () => {
    if (!user || !currentChat || !newMessageText.trim()) {
      return;
    }

    setSendingMessage(true);
    const messageText = newMessageText.trim();
    setNewMessageText('');

    try {
      const participants = [user.uid, currentChat.otherParticipantUid].sort();
      const chatDocId = `${currentChat.itemId}_${participants[0]}_${participants[1]}`;

      const chatDocRef = doc(db, 'chats', chatDocId);
      const chatDocSnapshot = await getDoc(chatDocRef);

      if (!chatDocSnapshot.exists()) {
        const myUsername = await getUserDisplayName(user.uid);

        await setDoc(chatDocRef, {
          itemId: currentChat.itemId,
          itemTitle: currentChat.itemTitle,
          participant1Uid: participants[0],
          participant2Uid: participants[1],
          participant1Email: participants[0] === user.uid ? user.email : currentChat.otherParticipantEmail,
          participant2Email: participants[1] === user.uid ? user.email : currentChat.otherParticipantEmail,
          participant1Username: participants[0] === user.uid ? myUsername : currentChat.otherParticipantUsername,
          participant2Username: participants[1] === user.uid ? myUsername : currentChat.otherParticipantUsername,
          createdAt: Timestamp.now(),
        });
      }

      await addDoc(collection(db, 'chats', chatDocId, 'messages'), {
        senderUid: user.uid,
        senderEmail: user.email,
        receiverUid: currentChat.otherParticipantUid,
        text: messageText,
        createdAt: Timestamp.now(),
      });

      await setDoc(chatDocRef, {
        lastMessageAt: Timestamp.now(),
      }, { merge: true });

    } catch (error: any) {
      console.error("Error sending message:", error);
      Alert.alert("Chat Error", `Failed to send message: ${error.message}`);
      setNewMessageText(messageText);
    } finally {
      setSendingMessage(false);
    }
  };
  // --- END NEW ---

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
          onChangeText={handleAutocomplete}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => {
            if (suggestions.length > 0) {
              handleSuggestionPress(suggestions[0]);
            }
          }}
          disabled={isSearching || suggestions.length === 0}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                <Text style={styles.suggestionText}>
                  {item.properties.formatted}
                </Text>
              </TouchableOpacity>
            )}
            onScrollBeginDrag={() => setShowSuggestions(false)}
          />
        </View>
      )}

      {/* Item Detail Modal */}
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
                    onPress={() => handleMessagePoster(selectedItem)}
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

      {/* New Item Post Modal */}
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

      {/* NEW: Chat Modal, moved from ChatScreen */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={chatModalVisible}
        onRequestClose={() => {
          setChatModalVisible(false);
          setCurrentChat(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatModalOverlay}
        >
          <View style={styles.chatModalContent}>
            {currentChat && (
              <>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatTitle}>
                    Chat with {currentChat.otherParticipantUsername || currentChat.otherParticipantEmail}
                  </Text>
                  <Text style={styles.chatSubTitle}>
                    About: {currentChat.itemTitle}
                  </Text>
                </View>

                <ScrollView
                  ref={messagesScrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  onContentSizeChange={() => {
                    messagesScrollViewRef.current?.scrollToEnd({ animated: true });
                  }}
                >
                  {messages.length === 0 ? (
                    <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
                  ) : (
                    messages.map((message) => (
                      <View
                        key={message.id}
                        style={[
                          styles.messageBubble,
                          message.senderUid === user?.uid ? styles.myMessage : styles.otherMessage,
                        ]}
                      >
                        <Text style={styles.messageText}>{message.text}</Text>
                        <Text style={styles.messageTime}>
                          {message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                <View style={styles.messageInputContainer}>
                  <TextInput
                    style={styles.messageInput}
                    placeholder="Type your message..."
                    value={newMessageText}
                    onChangeText={setNewMessageText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.sendButton,
                      (!newMessageText.trim() || sendingMessage) && styles.disabledButton
                    ]} 
                    onPress={handleSendMessage}
                    disabled={!newMessageText.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.sendButtonText}>Send</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, styles.chatCloseButton]}
                  onPress={() => {
                    setChatModalVisible(false);
                    setCurrentChat(null);
                  }}
                >
                  <Text style={styles.buttonText}>Close Chat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* END NEW CHAT MODAL */}
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
  suggestionsContainer: {
    position: 'absolute',
    top: 100,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  // --- NEW: Chat Modal Styles ---
  chatModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  chatModalContent: {
    width: '100%',
    height: '85%',
    backgroundColor: '#E5E5E5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  chatHeader: {
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
    marginBottom: 10,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  chatSubTitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  noMessagesText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: Platform.OS === 'ios' ? 0 : 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chatCloseButton: {
    marginTop: 15,
    backgroundColor: '#6c757d',
  },
});

export default MapScreen;