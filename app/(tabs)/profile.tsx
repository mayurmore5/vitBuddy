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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext'; // Assuming AuthContext provides user info and logout
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firbase.config';
import { getAuth, signOut } from 'firebase/auth'; // Import signOut from firebase/auth

// Define a simple interface for user data if you fetch it from Firestore
interface UserProfile {
  username: string;
  email: string;
  profilePictureUrl?: string; // Optional profile picture URL
  // Add any other profile fields you might have
}

const ProfileScreen = () => {
  const { user, loading: authLoading } = useAuth(); // Get user and loading state from AuthContext
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);

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
            username: data.username || user.email?.split('@')[0] || 'User', // Fallback to email prefix
            email: user.email || 'N/A',
            profilePictureUrl: data.profilePictureUrl || null,
          });
        } else {
          // If no profile document, use default user info
          setProfileData({
            username: user.email?.split('@')[0] || 'User',
            email: user.email || 'N/A',
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to load profile data.");
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

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            try {
              const auth = getAuth(); // Get the auth instance
              await signOut(auth); // Sign out the user
              Alert.alert("Success", "You have been logged out.");
              // Optionally navigate to a login/welcome screen after logout
              // navigation.navigate('Login'); // If you have a login screen
            } catch (error: any) {
              console.error("Error logging out:", error);
              Alert.alert("Logout Error", `Failed to log out: ${error.message}`);
            }
          },
          style: "destructive",
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
        {/* Optionally add a button to navigate to login */}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{profileData?.email || user.email}</Text>
        </View>
        {/* Add more account info fields here */}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Privacy Settings</Text>
        </TouchableOpacity>
        {/* Add more settings items */}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
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
    borderColor: '#007BFF',
    marginBottom: 15,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#007BFF',
  },
  avatarText: {
    color: 'white',
    fontSize: 50,
    fontWeight: 'bold',
  },
  usernameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#777',
  },
  card: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
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
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    width: '90%',
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
});

export default ProfileScreen;
