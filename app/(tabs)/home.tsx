import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  ImageBackground,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../../components/CustomNavBar';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const features: {
    id: string;
    icon: string;
    title: string;
    description: string;
    stats: string;
    gradient: [string, string]; // <-- tuple type
    route: string;
  }[] = [
    {
      id: 'lost-found',
      icon: '🔍',
      title: 'Lost & Found',
      description: 'Smart matching system to reunite you with your lost items quickly',
      stats: '50+ items recovered',
      gradient: ['#FF6B6B', '#FF8E8E'],
      route: '/(tabs)/map'
    },
    {
      id: 'marketplace',
      icon: '🛍️',
      title: 'Marketplace',
      description: 'Buy and sell with fellow students in a trusted environment',
      stats: '10+ active listings',
      gradient: ['#4ECDC4', '#6EE7DB'],
      route: '/(tabs)/marketplace'
    },
    {
      id: 'projects',
      icon: '📚',
      title: 'Study Hub',
      description: 'Share notes, projects, and collaborate with classmates',
      stats: '20+ shared resources',
      gradient: ['#45B7D1', '#72C7E8'],
      route: '/(tabs)/projects'
    },
    {
      id: 'chat',
      icon: '💬',
      title: 'Secure Chat',
      description: 'Connect safely with buyers, sellers, and study partners',
      stats: '5+ daily messages',
      gradient: ['#FFD93D', '#FFE066'],
      route: '/(tabs)/chat'
    }
  ];

  const stats = [
    { value: '50+', label: 'Active Students', icon: '👥' },
    { value: '4', label: 'Campuses', icon: '🏫' },
    { value: '95%', label: 'Success Rate', icon: '📈' },
    { value: '24/7', label: 'Support', icon: '🛡️' }
  ];

  const capabilities = [
    'AI-powered smart item matching and recommendations',
    'Secure peer-to-peer transactions with verified profiles',
    'Real-time notifications for lost item matches',
    'Integrated chat with privacy controls and reporting',
    'Campus-specific communities and trending items',
    'Advanced search filters and location-based results'
  ];

  return (
    <View style={styles.container}>
      <CustomNavBar />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.heroGradient}>
          <Animated.View 
            style={[
              styles.heroContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.heroIconContainer}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.heroIcon}>
                <Text style={styles.heroIconText}>🎓</Text>
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Campus Lost & Found</Text>
            <Text style={styles.heroSubtitle}>
              Your ultimate campus companion for finding lost items, trading with classmates, and sharing knowledge
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>Get Started Free</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Everything You Need</Text>
          <Text style={styles.sectionSubtitle}>
            Comprehensive tools designed specifically for campus life
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => router.push(feature.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={feature.gradient}
                  style={styles.featureGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <View style={styles.featureIconContainer}>
                    <LinearGradient colors={feature.gradient} style={styles.featureIcon}>
                      <Text style={styles.featureIconText}>{feature.icon}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                  <View style={styles.featureFooter}>
                    <View style={styles.statsTag}>
                      <Text style={styles.statsTagText}>{feature.stats}</Text>
                    </View>
                    <Text style={styles.exploreText}>Explore →</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Capabilities Section */}
        <View style={styles.capabilitiesSection}>
          <LinearGradient 
            colors={['#ffffff', '#f8fafc']} 
            style={styles.capabilitiesCard}
          >
            <Text style={styles.capabilitiesTitle}>What Makes Us Special?</Text>
            <View style={styles.capabilitiesList}>
              {capabilities.map((capability, index) => (
                <View key={index} style={styles.capabilityItem}>
                  <View style={styles.capabilityBullet}>
                    <LinearGradient colors={['#10B981', '#34D399']} style={styles.bulletGradient}>
                      <View style={styles.bulletDot} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.capabilityText}>{capability}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.profileGradient}>
                <Text style={styles.profileButtonText}>👤 Manage Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <Text style={styles.bottomCTATitle}>Ready to get started?</Text>
          <Text style={styles.bottomCTASubtitle}>
            Join thousands of students already using our platform
          </Text>
          <TouchableOpacity style={styles.bottomCTAButton}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.bottomCTAGradient}>
              <Text style={styles.bottomCTAText}>Download App</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    backgroundColor: '#f8fafc',
  },
  
  // Hero Section
  heroGradient: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: 24,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  heroIconText: {
    fontSize: 48,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 36,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  ctaButton: {
    marginTop: 16,
  },
  ctaGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Stats Section
  statsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: width * 0.42,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 26,
    fontWeight: '500',
  },
  featuresGrid: {
    gap: 20,
  },
  featureCard: {
    borderRadius: 24,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  featureGradient: {
    padding: 28,
    borderRadius: 24,
  },
  featureIconContainer: {
    marginBottom: 20,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIconText: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 20,
  },
  featureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statsTagText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
  },
  exploreText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '800',
  },

  // Capabilities Section
  capabilitiesSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  capabilitiesCard: {
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  capabilitiesTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 32,
  },
  capabilitiesList: {
    marginBottom: 32,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  capabilityBullet: {
    marginRight: 16,
    marginTop: 4,
  },
  bulletGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletDot: {
    width: 8,
    height: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  capabilityText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    flex: 1,
    fontWeight: '500',
  },
  profileButton: {
    alignSelf: 'center',
  },
  profileGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom CTA
  bottomCTA: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  bottomCTATitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  bottomCTASubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    fontWeight: '500',
  },
  bottomCTAButton: {
    width: width * 0.85,
  },
  bottomCTAGradient: {
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomCTAText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});