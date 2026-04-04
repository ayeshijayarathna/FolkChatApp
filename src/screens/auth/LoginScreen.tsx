import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ImageBackground, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { signInWithEmail, signInWithGoogle } from '../../services/firebase';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmail(email, password);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigation.replace('MainTabs');
    } catch (e: any) {
      if (e.message?.includes('DEVELOPER_ERROR')) {
        setError('Google Sign In config error. Please check setup.');
      } else if (e.message?.includes('SIGN_IN_CANCELLED')) {
        setError('');
      } else {
        setError(e.message || 'Google sign in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/auth_bg.png')}
      style={styles.bg}
      resizeMode="cover">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled">

            <View style={styles.header}>
              <Text style={styles.headerTitle}>Welcome Back</Text>
              <Text style={styles.headerSub}>Log in to FolkChat</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.errorContainer}>
                {error !== '' && <Text style={styles.error}>{error}</Text>}
              </View>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.saffron}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgot}
                onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading || googleLoading}>
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.loginBtnText}>Log In</Text>}
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
                onPress={handleGoogle}
                disabled={loading || googleLoading}>
                {googleLoading ? (
                  <ActivityIndicator color={COLORS.darkText} />
                ) : (
                  <View style={styles.googleBtnInner}>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupLink}>
                  Don't have an account?{' '}
                  <Text style={styles.signupLinkBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  overlay: { flex: 1, backgroundColor: 'rgba(172, 144, 101, 0.45)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  headerTitle: { fontSize: 36, fontWeight: 'bold', color: COLORS.white },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  errorContainer: { minHeight: 20, marginBottom: 8 },
  error: { color: '#FF6B6B', textAlign: 'center', fontSize: 13 },
  label: { color: COLORS.white, fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.darkText, marginBottom: 16,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  eyeBtn: { padding: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12 },
  forgot: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: COLORS.saffron, fontSize: 13, fontWeight: '500' },
  loginBtn: {
    backgroundColor: COLORS.saffron, padding: 16,
    borderRadius: 12, alignItems: 'center', marginBottom: 20,
  },
  loginBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  orText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  googleBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)', padding: 14,
    borderRadius: 12, alignItems: 'center', marginBottom: 24, minHeight: 50,
    justifyContent: 'center',
  },
  googleBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleBtnText: { color: COLORS.darkText, fontSize: 15, fontWeight: '600' },
  signupLink: { textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  signupLinkBold: { color: COLORS.saffron, fontWeight: 'bold' },
});