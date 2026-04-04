import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

const LoginScreen = require('../screens/auth/LoginScreen').default;
const SignUpScreen = require('../screens/auth/SignUpScreen').default;
const ForgotPasswordScreen = require('../screens/auth/ForgotPasswordScreen').default;

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}