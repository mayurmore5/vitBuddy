import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firbase.config';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';

interface MarketplaceItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  description?: string;
  posterUid?: string;
  createdAt?: any;
}

interface ChatMessage {
  id: string;
  senderUid: string;
  senderEmail: string | null;
  receiverUid: string;
  text: string;
  createdAt: any;
}

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

const MarketplaceScreen = () => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesScrollViewRef = React.useRef<ScrollView>(null);
  const [chatHeader, setChatHeader] = useState<{ sellerName: string | null }>({ sellerName: null });

  useEffect(() => {
    const q = query(collection(db, 'marketplaceItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: MarketplaceItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as MarketplaceItem);
      });
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching marketplace items:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSellerName = async () => {
      if (detailModalVisible && selectedItem && selectedItem.posterUid) {
        const sellerName = await getUserDisplayName(selectedItem.posterUid);
        setChatHeader({ sellerName });
      }
    };
    fetchSellerName();
  }, [detailModalVisible, selectedItem]);

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
      setNewImage(result.assets[0].uri);
    }
  };

  const handlePostItem = async () => {
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to post an item.');
      return;
    }
    if (!newTitle.trim() || !newPrice.trim()) {
      Alert.alert('Missing Info', 'Please enter a title and price.');
      return;
    }
    setUploading(true);
    let imageUrl = null;
    try {
      // For now, just use the local URI. In production, upload to Firebase Storage and get a URL.
      imageUrl = newImage;
      await addDoc(collection(db, 'marketplaceItems'), {
        title: newTitle.trim(),
        price: parseFloat(newPrice),
        description: newDescription.trim(),
        imageUrl,
        posterUid: user.uid,
        createdAt: Timestamp.now(),
      });
      setModalVisible(false);
      setNewTitle('');
      setNewPrice('');
      setNewDescription('');
      setNewImage(null);
      Alert.alert('Success', 'Item posted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post item.');
    } finally {
      setUploading(false);
    }
  };

  // Listen for chat messages for the selected item and seller
  useEffect(() => {
    if (!db || !selectedItem || !user || !chatModalVisible) {
      setMessages([]);
      return;
    }
    if (selectedItem.posterUid === user.uid) return;
    const participants = [user.uid, selectedItem.posterUid].sort();
    const chatDocId = `${selectedItem.id}_${participants[0]}_${participants[1]}`;
    const chatMessagesRef = collection(db, 'chats', chatDocId, 'messages');
    const q = query(chatMessagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(fetchedMessages);
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, (error) => {
      console.error('Error fetching chat messages:', error);
    });
    return () => unsubscribe();
  }, [db, selectedItem, user, chatModalVisible]);

  const handleSendMessage = async () => {
    if (!user || !selectedItem || !newMessageText.trim()) return;
    if (selectedItem.posterUid === user.uid) return;
    setSendingMessage(true);
    const messageText = newMessageText.trim();
    setNewMessageText('');
    try {
      const participants = [user.uid, selectedItem.posterUid].sort();
      const chatDocId = `${selectedItem.id}_${participants[0]}_${participants[1]}`;
      const chatDocRef = doc(db, 'chats', chatDocId);
      const chatDocSnapshot = await getDoc(chatDocRef);
      if (!chatDocSnapshot.exists()) {
        await setDoc(chatDocRef, {
          itemId: selectedItem.id,
          itemTitle: selectedItem.title,
          participant1Uid: participants[0],
          participant2Uid: participants[1],
          participant1Email: participants[0] === user.uid ? user.email : null,
          participant2Email: participants[1] === user.uid ? user.email : null,
          createdAt: Timestamp.now(),
        });
      }
      await addDoc(collection(db, 'chats', chatDocId, 'messages'), {
        senderUid: user.uid,
        senderEmail: user.email,
        receiverUid: selectedItem.posterUid,
        text: messageText,
        createdAt: Timestamp.now(),
      });
      await setDoc(chatDocRef, {
        lastMessageAt: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessageText(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading marketplace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Discover amazing deals from your community</Text>
        <TouchableOpacity style={styles.postButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.postButtonText}>+ Sell Something</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for posting new item */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>List New Item</Text>
            <Text style={styles.modalSubtitle}>Add details about your item</Text>
            
            <TextInput
              style={styles.input}
              placeholder="What are you selling?"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.input}
              placeholder="Price (e.g., 99.99)"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Describe your item..."
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Text style={styles.imagePickerButtonText}>
                {newImage ? '📸 Change Photo' : '📷 Add Photos'}
              </Text>
            </TouchableOpacity>
            {newImage && <Image source={{ uri: newImage }} style={styles.previewImage} />}
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, uploading && styles.disabledButton]}
                onPress={handlePostItem}
                disabled={uploading}
              >
                <Text style={styles.primaryButtonText}>
                  {uploading ? 'Publishing...' : 'Publish Listing'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setModalVisible(false)}
                disabled={uploading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedItem.imageUrl && (
                  <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} />
                )}
                <View style={styles.detailInfo}>
                  <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                  <Text style={styles.detailPrice}>${selectedItem.price}</Text>
                  {selectedItem.description && (
                    <Text style={styles.detailDescription}>{selectedItem.description}</Text>
                  )}
                </View>
                
                <View style={styles.detailActions}>
                  {user && selectedItem.posterUid !== user.uid && (
                    <TouchableOpacity 
                      style={styles.chatButton} 
                      onPress={() => setChatModalVisible(true)}
                    >
                      <Text style={styles.chatButtonText}>💬 Message Seller</Text>
                    </TouchableOpacity>
                  )}
                  
                  {user && selectedItem.posterUid === user.uid && (
                    <View style={styles.ownerSection}>
                      <Text style={styles.ownerText}>✨ Your listing</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={async () => {
                          Alert.alert('Remove Listing', 'Are you sure you want to remove this listing?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: async () => {
                              try {
                                await deleteDoc(doc(db, 'marketplaceItems', selectedItem.id));
                                setDetailModalVisible(false);
                                Alert.alert('Removed', 'Listing removed successfully.');
                              } catch (err) {
                                Alert.alert('Error', 'Failed to remove listing.');
                              }
                            }}
                          ]);
                        }}
                      >
                        <Text style={styles.deleteButtonText}>🗑️ Remove Listing</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatModalOverlay}
        >
          <View style={styles.chatModalContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>
                {chatHeader.sellerName || 'Seller'}
              </Text>
              <Text style={styles.chatSubTitle}>About: {selectedItem?.title}</Text>
            </View>
            
            <ScrollView
              ref={messagesScrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                messagesScrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatIcon}>💬</Text>
                  <Text style={styles.emptyChatText}>Start the conversation!</Text>
                  <Text style={styles.emptyChatSubtext}>Send a message to inquire about this item</Text>
                </View>
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
                      {message.createdAt?.toDate ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessageText.trim() || sendingMessage) && styles.disabledSendButton
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
              style={styles.chatCloseButton}
              onPress={() => setChatModalVisible(false)}
            >
              <Text style={styles.chatCloseButtonText}>Close Chat</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Items List */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🛍️</Text>
          <Text style={styles.emptyStateTitle}>No items yet</Text>
          <Text style={styles.emptyStateText}>Be the first to list something for sale!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => { setSelectedItem(item); setDetailModalVisible(true); }}
              activeOpacity={0.9}
            >
              <View style={styles.itemCard}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>📷</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemPrice}>${item.price}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    textAlign:'center',
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  postButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 16,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    opacity: 0.5,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginVertical: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  imagePickerButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalButtonContainer: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  detailModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  detailImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  detailInfo: {
    padding: 24,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  detailPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  detailActions: {
    padding: 24,
    paddingTop: 0,
  },
  chatButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ownerSection: {
    alignItems: 'center',
  },
  ownerText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    margin: 24,
    marginTop: 0,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  chatModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatModalContent: {
    width: '100%',
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  chatHeader: {
    backgroundColor: '#6366F1',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatSubTitle: {
    fontSize: 14,
    color: '#C7D2FE',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 6,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.6,
    alignSelf: 'flex-end',
    marginTop: 4,
    color: '#FFFFFF',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledSendButton: {
    backgroundColor: '#D1D5DB',
  },
  chatCloseButton: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 34 : 16,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatCloseButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MarketplaceScreen;