import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="home" // Correctly points to app/(tabs)/home.tsx
        options={{
          title: 'Home',
          headerShown:false,
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map" // This should correspond to app/(tabs)/chat.tsx
        options={{
          title: 'Find your thing',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat" // This should correspond to app/(tabs)/chat.tsx
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="comments" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          headerShown:false,
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="book" color={color} />, // You can use another icon if you prefer
        }}
      />
      {/* Add more tabs here, e.g., for profile, settings */}
      
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          headerShown:false,
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="shopping-cart" color={color} />, // You can use another icon if you prefer
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="user" color={color} />,
        }}
      />
      
    </Tabs>
  );
}