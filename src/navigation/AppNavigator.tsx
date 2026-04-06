import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();

const SplashScreen = require('../screens/SplashScreen').default;
const OnboardingScreen = require('../screens/OnboardingScreen').default;
const AuthNavigator = require('./AuthNavigator').default;
const MainTabNavigator = require('./MainTabNavigator').default;
const EditProfileScreen = require('../screens/secondary/EditProfileScreen').default;
const AnalyticsScreen = require('../screens/secondary/AnalyticsScreen').default;
const NotificationsScreen = require('../screens/secondary/NotificationsScreen').default;
const UserProfileScreen = require('../screens/secondary/UserProfileScreen').default;
const FollowListScreen = require('../screens/secondary/FollowListScreen').default;
const ChatScreen = require('../screens/main/MessagesScreen').default;
const ChangePasswordScreen = require('../screens/secondary/ChangePasswordScreen').default;
const HelpCenterScreen = require('../screens/secondary/HelpCenterScreen').default;
const PrivacyPolicyScreen = require('../screens/secondary/PrivacyPolicyScreen').default;
const AboutScreen = require('../screens/secondary/AboutScreen').default;
const DeleteAccountScreen = require('../screens/secondary/DeleteAccountScreen').default;

export default function AppNavigator() {
  const { user } = useAuthStore();
  const { colors } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.saffron,
          background: colors.bg,
          card: colors.card,
          text: colors.darkText,
          border: colors.border,
          notification: colors.saffron,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="FollowList" component={FollowListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
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