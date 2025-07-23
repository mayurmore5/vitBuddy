import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const mockResources = [
  {
    id: '1',
    title: 'Data Structures Notes',
    author: 'Alice',
    type: 'Notes',
    description: 'Comprehensive notes for CS201',
  },
  {
    id: '2',
    title: 'IoT Weather Station Project',
    author: 'Bob',
    type: 'Project',
    description: 'A full hardware + code guide',
  },
  {
    id: '3',
    title: 'Machine Learning Cheat Sheet',
    author: 'Carol',
    type: 'Notes',
    description: 'Quick reference for ML algorithms',
  },
  {
    id: '4',
    title: 'Smart Attendance System',
    author: 'David',
    type: 'Project',
    description: 'Face recognition based attendance',
  },
];

export default function ProjectsScreen() {
  const [resources, setResources] = useState(mockResources);

  // Placeholder for upload/share logic
  const handleShare = () => {
    // TODO: Implement upload/share modal
    Alert.alert('Share/upload feature coming soon!');
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={["#45B7D1", "#72C7E8"]} style={styles.heroSection}>
        <Text style={styles.heroTitle}>Study Hub</Text>
        <Text style={styles.heroSubtitle}>
          Share notes, upload projects, and collaborate with your classmates!
        </Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
          <LinearGradient colors={["#4ECDC4", "#45B7D1"]} style={styles.shareButtonGradient}>
            <Text style={styles.shareButtonText}>+ Share Project or Notes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Shared Resources</Text>
      <FlatList
        data={resources}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.resourcesList}
        renderItem={({ item }) => (
          <View style={styles.resourceCard}>
            <LinearGradient
              colors={item.type === 'Project' ? ["#FF6B6B", "#FFD93D"] : ["#4ECDC4", "#72C7E8"]}
              style={styles.resourceTypeTag}
            >
              <Text style={styles.resourceTypeText}>{item.type}</Text>
            </LinearGradient>
            <Text style={styles.resourceTitle}>{item.title}</Text>
            <Text style={styles.resourceDesc}>{item.description}</Text>
            <Text style={styles.resourceAuthor}>By {item.author}</Text>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#e0f7fa',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 22,
  },
  shareButton: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
  },
  resourcesList: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  resourceTypeTag: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  resourceTypeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  resourceTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2a2a72',
    marginBottom: 4,
  },
  resourceDesc: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  resourceAuthor: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
});