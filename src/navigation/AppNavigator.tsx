import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator();

const SplashScreen = require('../screens/SplashScreen').default;
const OnboardingScreen = require('../screens/OnboardingScreen').default;
const AuthNavigator = require('./AuthNavigator').default;
const MainTabNavigator = require('./MainTabNavigator').default;
const ProfileScreen = require('../screens/secondary/ProfileScreen').default;
const EditProfileScreen = require('../screens/secondary/EditProfileScreen').default;
const AnalyticsScreen = require('../screens/secondary/AnalyticsScreen').default;
const NotificationsScreen = require('../screens/secondary/NotificationsScreen').default;

export default function AppNavigator() {
  const { user } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}