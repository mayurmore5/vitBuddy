
// app/(tabs)/map.tsx
// This file will serve as the main map screen for your Lost and Found app.
// MODIFIED: Uses Firebase Auth/Firestore for user/data, and Appwrite Storage for photos.
// FIXED: Chat functionality with proper Firestore operations and error handling.
// NEW: Added a 'My Chats' modal to allow users to view and respond to messages.
// NEW: Added search functionality for places using expo-location.

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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, LatLng, MapPressEvent } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; // NEW: For geocoding (search)
// Appwrite SDK imports (for Storage)
import { Client, Storage, ID } from 'appwrite';
// Firebase Firestore imports (for item metadata and CHAT messages)
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
}

// NEW interface for displaying active chats
interface ActiveChat {
  chatId: string;
  itemId: string;
  itemTitle: string;
  otherParticipantEmail: string;
  lastMessageAt: Timestamp;
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

  // --- Chat States ---
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesScrollViewRef = useRef<ScrollView>(null);

  // --- NEW Chat List States ---
  const [myChatsModalVisible, setMyChatsModalVisible] = useState(false);
  const [myActiveChats, setMyActiveChats] = useState<ActiveChat[]>([]);
  const [fetchingChats, setFetchingChats] = useState(false);

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

  // --- NEW: Fetch and listen for active chats for the current user ---
  useEffect(() => {
    if (!db || !user) {
      setMyActiveChats([]);
      return;
    }
    
    setFetchingChats(true);
    const q = query(
      collection(db, 'chats'),
      or(where('participant1Uid', '==', user.uid), where('participant2Uid', '==', user.uid)),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats: ActiveChat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherParticipantEmail = data.participant1Uid === user.uid 
          ? data.participant2Email 
          : data.participant1Email;
        
        fetchedChats.push({
          chatId: doc.id,
          itemId: data.itemId,
          itemTitle: data.itemTitle,
          otherParticipantEmail: otherParticipantEmail,
          lastMessageAt: data.lastMessageAt,
        });
      });
      setMyActiveChats(fetchedChats);
      setFetchingChats(false);
    }, (error) => {
      console.error("Error fetching active chats:", error);
      setFetchingChats(false);
    });

    return () => unsubscribe();
  }, [db, user]);

  // --- Chat Message Listener ---
  useEffect(() => {
    if (!db || !currentChat || !user) {
      setMessages([]);
      return;
    }

    const participants = [user.uid, currentChat.otherParticipantUid].sort();
    const chatDocId = `${currentChat.itemId}_${participants[0]}_${participants[1]}`;

    console.log("Setting up chat listener for:", chatDocId);

    const chatMessagesRef = collection(db, 'chats', chatDocId, 'messages');
    const q = query(chatMessagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedMessages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
        });
        console.log("Fetched messages:", fetchedMessages.length);
        setMessages(fetchedMessages);
        // Auto-scroll to bottom
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

      console.log("File object being sent to Appwrite:", fileToUpload);

      const file = await appwriteStorage.createFile(
        APPWRITE_BUCKET_ID,
        ID.unique(),
        fileToUpload as File,
        [`read("user:${uid}")`, `write("user:${uid}")`]
      );

      console.log("File uploaded successfully to Appwrite:", file);

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

  // --- Handle Message Poster button click ---
  const handleMessagePoster = (item: LostFoundItem) => {
    if (!user) {
      Alert.alert("Login Required", "You must be logged in to chat.");
      return;
    }
    if (user.uid === item.posterUid) {
      Alert.alert("Cannot Chat", "You cannot chat with yourself.");
      return;
    }

    // Set up the chat with the correct details
    setCurrentChat({
      itemId: item.id,
      itemTitle: item.title,
      posterUid: item.posterUid,
      posterEmail: item.posterEmail,
      otherParticipantUid: item.posterUid, // The poster is the other participant
      otherParticipantEmail: item.posterEmail,
    });
    
    setChatModalVisible(true);
    setItemDetailModalVisible(false);
  };

  // --- NEW: Function to open a chat from the My Chats list
  const handleOpenChat = (chat: ActiveChat) => {
    if (!user) return;

    const participants = chat.chatId.split('_').slice(1);
    const otherUid = participants[0] === user.uid ? participants[1] : participants[0];

    // Find the item details for the chat
    const relatedItem = items.find(item => item.id === chat.itemId);
    const itemTitle = relatedItem ? relatedItem.title : "Item Not Found";

    setCurrentChat({
      itemId: chat.itemId,
      itemTitle: itemTitle,
      posterUid: relatedItem?.posterUid || '', // posterUid might not be the other participant
      posterEmail: relatedItem?.posterEmail || '', // Store the poster's info for context
      otherParticipantUid: otherUid,
      otherParticipantEmail: chat.otherParticipantEmail,
    });
    setMyChatsModalVisible(false);
    setChatModalVisible(true);
  };

  // --- Send Chat Message ---
  const handleSendMessage = async () => {
    if (!user || !currentChat || !newMessageText.trim()) {
      console.log("Cannot send message - missing requirements");
      return;
    }

    setSendingMessage(true);
    const messageText = newMessageText.trim();
    setNewMessageText(''); // Clear input immediately for better UX

    try {
      // Use the otherParticipantUid for the chat doc ID
      const participants = [user.uid, currentChat.otherParticipantUid].sort();
      const chatDocId = `${currentChat.itemId}_${participants[0]}_${participants[1]}`;

      const chatDocRef = doc(db, 'chats', chatDocId);
      const chatDocSnapshot = await getDoc(chatDocRef);

      if (!chatDocSnapshot.exists()) {
        await setDoc(chatDocRef, {
          itemId: currentChat.itemId,
          itemTitle: currentChat.itemTitle,
          participant1Uid: participants[0],
          participant2Uid: participants[1],
          participant1Email: participants[0] === user.uid ? user.email : currentChat.otherParticipantEmail,
          participant2Email: participants[1] === user.uid ? user.email : currentChat.otherParticipantEmail,
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
      setNewMessageText(messageText); // Restore the message text if sending failed
    } finally {
      setSendingMessage(false);
    }
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
        {/* Display a temporary marker for the selected location before saving */}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="New Item Location"
            pinColor="blue"
          />
        )}

        {/* Display markers for all existing lost/found items */}
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

      {/* NEW: Search Bar and Button */}
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

      {/* NEW: Button to open My Chats modal */}
      {user && (
        <TouchableOpacity
          style={styles.myChatsButton}
          onPress={() => setMyChatsModalVisible(true)}
        >
          <Text style={styles.myChatsButtonText}>My Chats</Text>
        </TouchableOpacity>
      )}

      {/* Modal for adding a new item */}
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

      {/* Modal for displaying item details */}
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

                {/* Conditional Delete Button */}
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

                {/* Message Poster Button */}
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

      {/* NEW: My Chats Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={myChatsModalVisible}
        onRequestClose={() => setMyChatsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>My Active Chats</Text>
            <ScrollView style={{ width: '100%' }}>
              {fetchingChats ? (
                <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />
              ) : myActiveChats.length === 0 ? (
                <Text style={styles.noChatsText}>You have no active chats yet.</Text>
              ) : (
                myActiveChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.chatId}
                    style={styles.chatListItem}
                    onPress={() => handleOpenChat(chat)}
                  >
                    <Text style={styles.chatItemTitle}>{chat.itemTitle}</Text>
                    <Text style={styles.chatItemSubTitle}>
                      Chat with: {chat.otherParticipantEmail}
                    </Text>
                    <Text style={styles.chatItemTime}>
                      Last message: {chat.lastMessageAt.toDate().toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { marginTop: 20 }]}
              onPress={() => setMyChatsModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
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
                  <Text style={styles.chatTitle}>Chat about: {currentChat.itemTitle}</Text>
                  <Text style={styles.chatSubTitle}>
                    with {currentChat.otherParticipantEmail || 'Anonymous'}
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
                        <Text style={styles.messageSender}>
                          {message.senderUid === user?.uid ? 'You' : message.senderEmail || 'Anonymous'}
                        </Text>
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
                  style={[styles.button, styles.cancelButton, styles.chatCloseButton]}
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
  // --- Chat Modal Styles ---
  chatModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Stick to bottom for keyboard avoidance
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatModalContent: {
    width: '100%',
    height: '80%', // Occupy most of the screen
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  chatHeader: {
    marginBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  chatSubTitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  messagesContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  messagesContent: {
    paddingBottom: 20, // Ensure last message isn't cut off by input
  },
  noMessagesText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6', // Light green for sender
    borderBottomRightRadius: 2, // Pointy corner
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0', // Light gray for receiver
    borderBottomLeftRadius: 2, // Pointy corner
  },
  messageSender: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
    fontWeight: 'bold',
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
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    paddingHorizontal: 5,
    marginBottom: Platform.OS === 'ios' ? 0 : 10, // Adjust for Android keyboard
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100, // Prevent input from growing too large
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chatCloseButton: {
    marginTop: 15,
    backgroundColor: '#6c757d', // A neutral close button color
  },
  // --- NEW Styles for My Chats Modal ---
  myChatsButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  myChatsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatListItem: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  chatItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chatItemSubTitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  chatItemTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  noChatsText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  },
  // --- NEW Styles for Search Bar ---
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
    zIndex: 1, // Ensure it's on top of the map
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
