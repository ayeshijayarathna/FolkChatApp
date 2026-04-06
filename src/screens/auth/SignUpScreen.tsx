import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ImageBackground, Dimensions,
  ScrollView, ActivityIndicator,
  Image, 
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { signUpWithEmail, createUserProfile } from '../../services/firebase';
import { FOLK_CATEGORIES } from '../../constants/categories';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill all fields'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signUpWithEmail(email, password);

      await createUserProfile(result.user.uid, {
        name,
        email,
        artistCategory: selectedCategory,
        createdAt: new Date(),
        followers: [],
        following: [],
        bio: '',
        avatarUrl: '',
        coverUrl: '',
      });
      navigation.replace('MainTabs');
    } catch (e: any) {
      setError(e.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/auth_bg.png')}
      style={styles.bg}
      resizeMode="cover">

      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.headerImage}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Register!!</Text>
          </View>

          <View style={styles.card}>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.muted}
              value={name}
              onChangeText={setName}
            />

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

            <Text style={styles.label}>Artist Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}>
              {FOLK_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat)}>
                  <Text style={[
                    styles.chipText,
                    selectedCategory === cat && styles.chipTextActive,
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Create a password"
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

            <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={COLORS.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity
              style={styles.signupBtn}
              onPress={handleSignUp}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.signupBtnText}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>
                Already have an account?{' '}
                <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  overlay: { flex: 1},
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 24, alignItems: 'center' },
  headerImage: {
      width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.saffron,
  },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: COLORS.white },

  card: {
    backgroundColor: 'rgba(187, 124, 42, 0.13)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(70, 41, 3, 0.25)',
    marginBottom: 40,
  },

  error: { color: '#FF6B6B', marginBottom: 12, textAlign: 'center', fontSize: 13 },

  label: { color: COLORS.darkText, fontSize: 14, marginBottom: 8, fontWeight: '500' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.darkText,
    marginBottom: 16,
  },

  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 8,
    borderWidth: 1,
    borderColor:COLORS.rust,
  },

  chipActive: { backgroundColor: COLORS.saffron, borderColor: COLORS.saffron },
  chipText: { color:COLORS.rust, fontSize: 12 },
  chipTextActive: { color: COLORS.warmBg, fontWeight: '600' },

  signupBtn: {
    backgroundColor: COLORS.saffron,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  signupBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  loginLink: { textAlign: 'center', color:COLORS.darkText, fontSize: 14 },
  loginLinkBold: { color: COLORS.saffron, fontWeight: 'bold' },
});