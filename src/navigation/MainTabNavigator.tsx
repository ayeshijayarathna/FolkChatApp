import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { COLORS } from '../constants/colors';
import Ionicons from '@react-native-vector-icons/ionicons';
import HomeFeedScreen from '../screens/main/HomeFeedScreen';
import SearchScreen from '../screens/main/SearchScreen';
import UploadScreen from '../screens/main/UploadScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.saffron,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home')
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
          if (route.name === 'Search')
            return <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />;
          if (route.name === 'Upload')
            return <Ionicons name="add-circle" size={36} color={COLORS.saffron} />;
          if (route.name === 'Messages')
            return <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />;
          return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
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