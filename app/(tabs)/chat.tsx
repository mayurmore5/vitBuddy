import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  where,
  or,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firbase.config';

// Define interfaces
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

interface ActiveChat {
  chatId: string;
  itemId: string;
  itemTitle: string;
  otherParticipantEmail: string;
  otherParticipantUsername: string | null;
  lastMessageAt: Timestamp;
}

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

const ChatScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesScrollViewRef = useRef<ScrollView>(null);

  const [myActiveChats, setMyActiveChats] = useState<ActiveChat[]>([]);
  const [fetchingChats, setFetchingChats] = useState(false);

  const [currentChat, setCurrentChat] = useState<ChatDetails | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  // --- Fetch and listen for active chats for the current user ---
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
      // Optimized: Denormalized usernames are read directly from the chat document
      const fetchedChats: ActiveChat[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const otherParticipantUid = data.participant1Uid === user.uid 
          ? data.participant2Uid
          : data.participant1Uid;

        const otherParticipantEmail = data.participant1Uid === user.uid 
          ? data.participant2Email 
          : data.participant1Email;
        
        // Read the denormalized username
        const otherParticipantUsername = data.participant1Uid === user.uid 
          ? data.participant2Username
          : data.participant1Username;

        return {
          chatId: doc.id,
          itemId: data.itemId,
          itemTitle: data.itemTitle,
          otherParticipantEmail: otherParticipantEmail,
          otherParticipantUsername: otherParticipantUsername,
          lastMessageAt: data.lastMessageAt,
        };
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

  const handleOpenChat = (chat: ActiveChat) => {
    if (!user) return;

    const participants = chat.chatId.split('_').slice(1);
    const otherUid = participants[0] === user.uid ? participants[1] : participants[0];

    setCurrentChat({
      itemId: chat.itemId,
      itemTitle: chat.itemTitle,
      posterUid: '', // Not used, can be left blank
      posterEmail: '', // Not used, can be left blank
      otherParticipantUid: otherUid,
      otherParticipantEmail: chat.otherParticipantEmail,
      otherParticipantUsername: chat.otherParticipantUsername,
    });
    setChatModalVisible(true);
  };

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

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {fetchingChats ? (
        <ActivityIndicator size="large" color="#007BFF" style={styles.activityIndicator} />
      ) : myActiveChats.length === 0 ? (
        <Text style={styles.noChatsText}>You have no active chats yet.</Text>
      ) : (
        <ScrollView style={styles.chatListContainer}>
          {myActiveChats.map((chat) => (
            <TouchableOpacity
              key={chat.chatId}
              style={styles.chatListItem}
              onPress={() => handleOpenChat(chat)}
            >
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {chat.otherParticipantUsername?.charAt(0).toUpperCase() || chat.otherParticipantEmail.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.chatItemContent}>
                <Text style={styles.chatItemTitle}>{chat.otherParticipantUsername || chat.otherParticipantEmail}</Text>
                <Text style={styles.chatItemSubTitle}>
                  Item: {chat.itemTitle}
                </Text>
              </View>
              <Text style={styles.chatItemTime}>
                {chat.lastMessageAt.toDate().toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIndicator: {
    marginTop: 20,
  },
  chatListContainer: {
    width: '100%',
    padding: 10,
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  chatItemContent: {
    flex: 1,
    marginLeft: 15,
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
  },
  noChatsText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 16,
  },
  // --- Chat Modal Styles ---
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
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText:{
    color:'#ffffff',
  },
  chatCloseButton: {
    marginTop: 15,
    backgroundColor: '#6c757d',
  },
});

export default ChatScreen;