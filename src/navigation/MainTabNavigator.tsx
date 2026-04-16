import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { useAuthStore } from '../store/authStore';
import HomeFeedScreen from '../screens/main/HomeFeedScreen';
import SearchScreen from '../screens/main/SearchScreen';
import UploadScreen from '../screens/main/UploadScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const { t } = useLang();
  const { user } = useAuthStore();
  const [totalUnread, setTotalUnread] = useState(0);

  // Real time total unread message count
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection('chats')
      .where('participants', 'array-contains', user.uid)
      .onSnapshot(snap => {
        let count = 0;
        snap.docs.forEach(doc => {
          count += doc.data().unreadCount?.[user.uid] || 0;
        });
        setTotalUnread(count);
      }, () => { });
    return () => unsub();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.saffron,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home')
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
          if (route.name === 'Search')
            return <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />;
          if (route.name === 'Upload')
            return <Ionicons name="add-circle" size={36} color={colors.saffron} />;
          if (route.name === 'Messages')
            return (
              <View style={{ position: 'relative' }}>
                <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
                {totalUnread > 0 && (
                  <View style={[badgeStyles.badge, { backgroundColor: colors.saffron }]}>
                    <Text style={badgeStyles.badgeTxt}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
                  </View>
                )}
              </View>
            );
          return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
        },
        tabBarLabel: ({ focused, color }) => {
          const labels: Record<string, string> = {
            Home: t.home, Search: t.search, Upload: '',
            Messages: t.messages, Settings: t.settings_title,
          };
          if (route.name === 'Upload') return null;
          return <Text style={{ color, fontSize: 10, marginTop: -4 }}>{labels[route.name] || route.name}</Text>;
        },
      })}>
      <Tab.Screen name="Home" component={HomeFeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});