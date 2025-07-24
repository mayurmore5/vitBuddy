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
    <FlatList
      data={features}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.heroGradient}>
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
                <LinearGradient colors={['#FF6B6B', '#4ECDC4']} style={styles.heroIcon}>
                  <Text style={styles.heroIconText}>🎓</Text>
                </LinearGradient>
              </View>
              
              <Text style={styles.heroTitle}>Campus Lost & Found</Text>
              <Text style={styles.heroSubtitle}>
                Your ultimate campus companion for finding lost items, trading with classmates, and sharing knowledge
              </Text>
              
              <TouchableOpacity style={styles.ctaButton}>
                <LinearGradient colors={['#FF6B6B', '#4ECDC4']} style={styles.ctaGradient}>
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
        </>
      }
      renderItem={({ item }) => (
        <TouchableOpacity 
          key={item.id}
          style={styles.featureCard}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={item.gradient}
            style={styles.featureGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          >
            <View style={styles.featureIconContainer}>
              <LinearGradient colors={item.gradient} style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{item.icon}</Text>
              </LinearGradient>
            </View>
            
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureDescription}>{item.description}</Text>
            
            <View style={styles.featureFooter}>
              <View style={styles.statsTag}>
                <Text style={styles.statsTagText}>{item.stats}</Text>
              </View>
              <Text style={styles.exploreText}>Explore →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Hero Section
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heroIconText: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  ctaButton: {
    marginTop: 10,
  },
  ctaGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Stats Section
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: width * 0.42,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  featureGradient: {
    padding: 24,
    borderRadius: 20,
  },
  featureIconContainer: {
    marginBottom: 16,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statsTagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  exploreText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Capabilities Section
  capabilitiesSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  capabilitiesCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  capabilitiesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 24,
  },
  capabilitiesList: {
    marginBottom: 24,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  capabilityBullet: {
    marginRight: 12,
    marginTop: 2,
  },
  bulletGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletDot: {
    width: 6,
    height: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  capabilityText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    flex: 1,
  },
  profileButton: {
    alignSelf: 'center',
  },
  profileGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  profileButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Bottom CTA
  bottomCTA: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomCTATitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  bottomCTASubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  bottomCTAButton: {
    width: width * 0.8,
  },
  bottomCTAGradient: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomCTAText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});