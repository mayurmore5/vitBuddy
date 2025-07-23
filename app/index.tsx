import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/react-logo.png')} style={styles.logo} />
        <View style={styles.logoGlow} />
      </View>
      <Text style={styles.appName}>Campus Lost & Found</Text>
      <Text style={styles.tagline}>Find lost items, sell old products, and discover college projects!</Text>
      
      <View style={styles.featuresContainer}>
        <View style={[styles.featureBox, styles.featureBox1]}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>🔍</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Lost & Found</Text>
            <Text style={styles.featureDesc}>Report lost items or help others by posting found items on campus.</Text>
          </View>
        </View>
        
        <View style={[styles.featureBox, styles.featureBox2]}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>💸</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Sell Old Products</Text>
            <Text style={styles.featureDesc}>Easily sell your old books, gadgets, and more to fellow students.</Text>
          </View>
        </View>
        
        <View style={[styles.featureBox, styles.featureBox3]}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>📚</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>College Projects</Text>
            <Text style={styles.featureDesc}>Showcase and exchange college projects, notes, and resources.</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.loginButton]} 
          onPress={() => router.push('/(auth)/sign-in')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.registerButton]} 
          onPress={() => router.push('/(auth)/sign-up')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16, // smaller padding for compact layout
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logo: {
    width: width * 0.2,
    height: width * 0.2,
    resizeMode: 'contain',
    borderRadius: (width * 0.2) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
  },
  logoGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: (width * 0.2) / 2 + 8,
    zIndex: -1,
  },
  appName: {
    fontSize: 28, // reduced from 34
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    letterSpacing: 1.1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 15, // reduced from 17
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
    fontWeight: '500',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 30,
  },
  featureBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureBox1: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  featureBox2: {
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  featureBox3: {
    borderLeftWidth: 4,
    borderLeftColor: '#45B7D1',
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(103, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2a2a72',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontWeight: '400',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 22,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  registerButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
