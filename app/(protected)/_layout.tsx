import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

export default function ProtectedTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A0509',
          borderTopWidth: 1,
          borderTopColor: 'rgba(201,168,76,0.25)',
          height: 85,
          paddingTop: 10,
          paddingBottom: 15,
        },
        tabBarActiveTintColor: '#C9A84C',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
          marginTop: 6,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
              {focused ? (
                <View
                  style={{
                    marginTop: 4,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#C9A84C',
                  }}
                />
              ) : null}
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen
        name="viewer"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}