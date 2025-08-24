import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Alert, Modal, TextInput, Image, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, orderBy, deleteDoc, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../../firbase.config';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import CustomNavBar from '../../components/CustomNavBar';

const { width } = Dimensions.get('window');

type Resource = {
  id: string;
  title: string;
  author: string;
  authorUid: string;
  type: 'Notes' | 'Project';
  description: string;
  pdfUri: string | null;
  github: string | null;
};

export default function ProjectsScreen() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [shareType, setShareType] = useState<'Notes' | 'Project'>('Notes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfUri, setPdfUri] = useState('');
  const [github, setGithub] = useState('');
  // Remove images state

  const storage = getStorage();

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'studyResources'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetched: Resource[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
        setResources(fetched);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch resources.');
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, []);

  const handleShare = () => {
    setModalVisible(true);
  };

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.endsWith('.pdf')) return 'https://' + url; // for PDF links
    return 'https://' + url;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || (shareType === 'Notes' && !pdfUri.trim()) || (shareType === 'Project' && (!github.trim()))) {
      Alert.alert('Please fill all required fields.');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'studyResources'), {
        title,
        author: user?.email || 'You',
        authorUid: user?.uid || '',
        type: shareType,
        description,
        pdfUri: shareType === 'Notes' ? pdfUri.trim() : null,
        github: shareType === 'Project' ? github : null,
        // images removed
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setPdfUri('');
      setGithub('');
      // Remove images state
      // Refetch resources
      const q = query(collection(db, 'studyResources'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched: Resource[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
      setResources(fetched);
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to share resource.');
    }
  };

  return (
    <View style={styles.container}>
      <CustomNavBar title="Study Hub" />
      {/* Simple Header */}
      

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          handleShare();
        }}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <LinearGradient colors={['#4ECDC4', '#45B7D1']} style={styles.fabGradient}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Shared Resources</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#45B7D1" style={{ marginTop: 30 }} />
      ) : (
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
              {item.pdfUri && (
                <TouchableOpacity onPress={() => Linking.openURL(normalizeUrl(item.pdfUri!))}>
                  <Text style={styles.resourceLink} numberOfLines={1}>PDF: {item.pdfUri.split('/').pop()}</Text>
                </TouchableOpacity>
              )}
              {item.github && (
                <TouchableOpacity onPress={() => Linking.openURL(normalizeUrl(item.github!))}>
                  <Text style={styles.resourceLink} numberOfLines={1}>GitHub: {item.github}</Text>
                </TouchableOpacity>
              )}
              {/* No images for projects */}
              <Text style={styles.resourceAuthor}>By {item.author}</Text>
              {item.authorUid === user?.uid && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={async () => {
                    try {
                      await deleteDoc(firestoreDoc(db, 'studyResources', item.id));
                      setResources(resources.filter(r => r.id !== item.id));
                    } catch (err) {
                      Alert.alert('Error', 'Failed to delete resource.');
                    }
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* Share Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share {shareType}</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, shareType === 'Notes' && styles.toggleActive]}
                onPress={() => setShareType('Notes')}
              >
                <Text style={styles.toggleText}>Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, shareType === 'Project' && styles.toggleActive]}
                onPress={() => setShareType('Project')}
              >
                <Text style={styles.toggleText}>Project</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            {shareType === 'Notes' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="PDF Link (e.g. https://drive.google.com/...)"
                  value={pdfUri}
                  onChangeText={setPdfUri}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="GitHub Link"
                  value={github}
                  onChangeText={setGithub}
                />
                {/* No image upload for projects */}
              </>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSubmit}>
                <Text style={styles.modalButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 20,
    marginBottom: 16,
    marginTop: 20,
  },
  resourcesList: {
    paddingHorizontal: 12,
    paddingBottom: 100, // Space for floating button
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  resourceLink: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
    textDecorationLine: 'underline',
  },
  // resourceImage style removed
  resourceAuthor: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2a2a72',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4ECDC4',
  },
  toggleText: {
    fontWeight: 'bold',
    color: '#222',
    fontSize: 15,
  },
  input: {
    width: '100%',
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  uploadButton: {
    backgroundColor: '#45B7D1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  uploadedFile: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
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
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 20, // Account for tab bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  simpleHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  simpleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
});