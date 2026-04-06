import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import HomeFeedScreen from '../screens/main/HomeFeedScreen';
import SearchScreen from '../screens/main/SearchScreen';
import UploadScreen from '../screens/main/UploadScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const { t } = useLang();

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
            return (
              <View style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: colors.saffron,
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 4,
                elevation: 4,
                shadowColor: colors.saffron,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
              }}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            );
          if (route.name === 'Messages')
            return <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />;
          return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
        },
        tabBarLabel: ({ color }) => {
          if (route.name === 'Upload') return null;
          let label = '';
          if (route.name === 'Home') label = t.home;
          else if (route.name === 'Search') label = t.search;
          else if (route.name === 'Messages') label = t.messages;
          else if (route.name === 'Settings') label = t.settings_title;
          return (
            <Text style={{ color, fontSize: 10, marginTop: -2 }} numberOfLines={1}>
              {label}
            </Text>
          );
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