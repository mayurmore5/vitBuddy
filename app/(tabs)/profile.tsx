import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Switch,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firbase.config';
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

interface UserProfile {
  username: string;
  email: string;
  profilePictureUrl?: string;
}

interface SharedResource {
  id: string;
  title: string;
  type: 'Notes' | 'Project';
  description: string;
  pdfUri?: string;
  github?: string;
  createdAt: any;
}

const ProfileScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [resourcesModalVisible, setResourcesModalVisible] = useState(false);
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user || !db) {
        setFetchingProfile(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfileData({
            username: data.username || user.email?.split('@')[0] || 'User',
            email: user.email || 'N/A',
            profilePictureUrl: data.profilePictureUrl || null,
          });
        } else {
          setProfileData({
            username: user.email?.split('@')[0] || 'User',
            email: user.email || 'N/A',
          });
        }
      } catch (error) {
        setProfileData({
          username: user.email?.split('@')[0] || 'User',
          email: user.email || 'N/A',
        });
      } finally {
        setFetchingProfile(false);
      }
    };
    fetchUserProfile();
  }, [user, db]);

  const fetchSharedResources = async () => {
    if (!user || !db) return;
    
    setLoadingResources(true);
    try {
      const resourcesRef = collection(db, 'studyResources');
      const q = query(resourcesRef, where('authorUid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const resources: SharedResource[] = [];
      querySnapshot.forEach((doc) => {
        resources.push({ id: doc.id, ...doc.data() } as SharedResource);
      });
      
      setSharedResources(resources);
    } catch (error) {
      console.error('Error fetching shared resources:', error);
      Alert.alert('Error', 'Failed to load your shared resources.');
    } finally {
      setLoadingResources(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    Alert.alert(
      'Delete Resource',
      'Are you sure you want to delete this resource?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'studyResources', resourceId));
              setSharedResources(sharedResources.filter(r => r.id !== resourceId));
              Alert.alert('Success', 'Resource deleted successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete resource.');
            }
          }
        }
      ]
    );
  };

  const normalizeUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              const auth = getAuth();
              await signOut(auth);
              Alert.alert('Success', 'You have been logged out.');
            } catch (error: any) {
              Alert.alert('Logout Error', `Failed to log out: ${error.message}`);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  if (authLoading || fetchingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Please log in to view your profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.profileHeader}>
        {profileData?.profilePictureUrl ? (
          <Image source={{ uri: profileData.profilePictureUrl }} style={styles.profileImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profileData?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.usernameText}>{profileData?.username || 'Guest User'}</Text>
        <Text style={styles.emailText}>{profileData?.email || user.email}</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TouchableOpacity style={styles.optionRow}>
          <Text style={styles.optionIcon}>✏️</Text>
          <Text style={styles.optionText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow}>
          <Text style={styles.optionIcon}>🔒</Text>
          <Text style={styles.optionText}>Change Password</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => {
            setResourcesModalVisible(true);
            fetchSharedResources();
          }}
        >
          <Text style={styles.optionIcon}>📄</Text>
          <Text style={styles.optionText}>My Shared Resources</Text>
          <Text style={styles.optionCount}>{sharedResources.length}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>🌙</Text>
          <Text style={styles.optionText}>Dark Mode</Text>
          <View style={{ flex: 1 }} />
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            thumbColor={darkMode ? '#764ba2' : '#eee'}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>
        <TouchableOpacity style={styles.optionRow}>
          <Text style={styles.optionIcon}>❓</Text>
          <Text style={styles.optionText}>Help & Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow}>
          <Text style={styles.optionIcon}>⚙️</Text>
          <Text style={styles.optionText}>App Settings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Shared Resources Modal */}
      <Modal
        visible={resourcesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Shared Resources</Text>
            <TouchableOpacity 
              onPress={() => setResourcesModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingResources ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingText}>Loading your resources...</Text>
            </View>
          ) : sharedResources.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No Resources Shared Yet</Text>
              <Text style={styles.emptyText}>Start sharing your notes and projects to see them here!</Text>
            </View>
          ) : (
            <FlatList
              data={sharedResources}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.resourcesList}
              renderItem={({ item }) => (
                <View style={styles.resourceCard}>
                  <View style={styles.resourceHeader}>
                    <Text style={styles.resourceType}>{item.type}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteResource(item.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.resourceTitle}>{item.title}</Text>
                  <Text style={styles.resourceDescription}>{item.description}</Text>
                  
                  {item.pdfUri && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(normalizeUrl(item.pdfUri!))}
                      style={styles.linkButton}
                    >
                      <Text style={styles.linkText}>📄 View PDF</Text>
                    </TouchableOpacity>
                  )}
                  
                  {item.github && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(normalizeUrl(item.github!))}
                      style={styles.linkButton}
                    >
                      <Text style={styles.linkText}>🔗 View on GitHub</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  noUserText: {
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
    marginTop: 50,
  },
  profileHeader: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 0,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 15,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#764ba2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    color: 'white',
    fontSize: 50,
    fontWeight: 'bold',
  },
  usernameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 10,
  },
  card: {
    width: '92%',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#764ba2',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  optionCount: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: 'bold',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  logoutButton: {
    width: '92%',
    backgroundColor: '#DC3545',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  resourcesList: {
    padding: 20,
  },
  resourceCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resourceType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  linkButton: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
});

export default ProfileScreen;
