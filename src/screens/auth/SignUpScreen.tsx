import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, ScrollView,
  ActivityIndicator, Image, ImageBackground, StatusBar,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { signUpWithEmail, createUserProfile } from '../../services/firebase';
import { FOLK_CATEGORIES } from '../../constants/categories';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

const HEADER_H     = height * 0.30;
const LOGO_SIZE    = 96;
const LOGO_OVERLAP = LOGO_SIZE / 2;
const ARCH_RADIUS  = width * 0.55;
const LOGO_BOTTOM  = HEADER_H - LOGO_OVERLAP + LOGO_SIZE;

export default function SignUpScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading]                 = useState(false);

  type FieldErrors = { name?: string; email?: string; password?: string; confirmPassword?: string; general?: string };
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = () => {
    const e: FieldErrors = {};
    if (!name.trim())             e.name = 'Full name is required';
    else if (name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!email.trim())            e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address';
    if (!password)                e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    else if (!/[A-Z]/.test(password)) e.password = 'Include at least one uppercase letter';
    if (!confirmPassword)         e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true); setErrors({});
    try {
      const result = await signUpWithEmail(email, password);
      await createUserProfile(result.user.uid, {
        name, email,
        artistCategory: selectedCategory,
        createdAt: new Date(),
        followers: [], following: [],
        bio: '', avatarUrl: '', coverUrl: '',
      });
      navigation.replace('MainTabs');
    } catch (e: any) {
      setErrors({ general: e.message || 'Sign up failed' });
    } finally { setLoading(false); }
  };
 
  const inputBg = isDark ? colors.inputBg : 'rgba(255,255,255,0.92)';
  const cardBg  = isDark ? colors.card    : colors.bg;
  const LABEL_BLOCK_H = 28 + 4 + 20 + 20;

  return (
    <View style={[styles.root, { backgroundColor: cardBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/*arch header*/}
      <ImageBackground
        source={require('../../../assets/images/s2.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={[styles.headerScrim, isDark && styles.headerScrimDark]} />
      </ImageBackground>

      {/* logo */}
      <View style={[styles.logoWrap, { backgroundColor: cardBg, borderColor: colors.saffron }]}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      {/*lables*/}
      <View style={[styles.labelsWrap, { top: LOGO_BOTTOM + 10 }]}>
        <Text style={[styles.screenLabel, { color: colors.saffron }]}>SIGN UP HERE </Text>
      </View>

      {/* body*/}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: LOGO_OVERLAP + LABEL_BLOCK_H }} />

        {errors.general && (
          <Text style={[styles.errorGeneral, { backgroundColor: isDark ? 'rgba(224,82,82,0.15)' : 'rgba(224,82,82,0.08)' }]}>
            {errors.general}
          </Text>
        )}

        {/* Full Name */}
        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: errors.name ? '#E05252' : colors.border }]}>
          <Ionicons name="person-outline" size={18} color={errors.name ? '#E05252' : colors.muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.darkText }]}
            placeholder="Full Name" placeholderTextColor={colors.muted}
            value={name}
            onChangeText={t => { setName(t); setErrors(p => ({ ...p, name: undefined })); }}
          />
        </View>
        {errors.name && <Text style={styles.errorField}>{errors.name}</Text>}

        {/* Email */}
        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: errors.email ? '#E05252' : colors.border }]}>
          <Ionicons name="mail-outline" size={18} color={errors.email ? '#E05252' : colors.muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.darkText }]}
            placeholder="Email" placeholderTextColor={colors.muted}
            value={email}
            onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
            keyboardType="email-address" autoCapitalize="none"
          />
        </View>
        {errors.email && <Text style={styles.errorField}>{errors.email}</Text>}

        {/* Artist Category */}
        <Text style={[styles.label, { color: colors.darkText }]}>Artist Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {FOLK_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                { borderColor: colors.muted, backgroundColor: isDark ? colors.warmBg : 'rgba(255,255,255,0.6)' },
                selectedCategory === cat && { backgroundColor: colors.saffron, borderColor: colors.saffron },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.chipText,
                { color: colors.muted },
                selectedCategory === cat && { color: '#fff', fontWeight: '600' },
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Password */}
        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: errors.password ? '#E05252' : colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={errors.password ? '#E05252' : colors.muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1, color: colors.darkText }]}
            placeholder="Password" placeholderTextColor={colors.muted}
            value={password}
            onChangeText={t => { setPassword(t); setErrors(p => ({ ...p, password: undefined })); }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorField}>{errors.password}</Text>}

        {/* Confirm Password */}
        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: errors.confirmPassword ? '#E05252' : colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={errors.confirmPassword ? '#E05252' : colors.muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.darkText }]}
            placeholder="Confirm Password" placeholderTextColor={colors.muted}
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setErrors(p => ({ ...p, confirmPassword: undefined })); }}
            secureTextEntry={!showPassword}
          />
        </View>
        {errors.confirmPassword && <Text style={styles.errorField}>{errors.confirmPassword}</Text>}

        {/* Sign Up button */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.saffron }, loading && { opacity: 0.7 }]}
          onPress={handleSignUp} disabled={loading} activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.footerLink, { color: colors.muted }]}>
            Already have an account?{' '}
            <Text style={[styles.footerLinkBold, { color: colors.saffron }]}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    width, height: HEADER_H,
    justifyContent: 'flex-end',
    paddingBottom: LOGO_OVERLAP,
    paddingHorizontal: 28,
    borderBottomLeftRadius: ARCH_RADIUS,
    borderBottomRightRadius: ARCH_RADIUS,
    overflow: 'hidden',
  },
  headerScrim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,12,4,0.30)' },
  headerScrimDark: { backgroundColor: 'rgba(0,0,0,0.50)' },

  logoWrap: {
    position: 'absolute',
    top: HEADER_H - LOGO_OVERLAP,
    left: (width - LOGO_SIZE) / 2,
    width: LOGO_SIZE, height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 3, overflow: 'hidden', zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  logo: { width: '100%', height: '100%' },

  labelsWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 9,
  },
  screenLabel: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },

  scroll: { paddingHorizontal: 28 },

  errorGeneral: { color: '#E05252', fontSize: 13, marginBottom: 14, textAlign: 'center', padding: 10, borderRadius: 8 },
  errorField:   { color: '#E05252', fontSize: 12, marginTop: -4, marginBottom: 10, marginLeft: 4 },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, marginBottom: 6, borderWidth: 1,
  },
  inputIcon: { paddingLeft: 14, paddingRight: 8 },
  input:     { flex: 1, paddingVertical: 14, paddingRight: 12, fontSize: 14 },
  eyeBtn:    { padding: 12 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, marginRight: 8, borderWidth: 1,
  },
  chipText: { fontSize: 12 },

  primaryBtn: {
    paddingVertical: 16, borderRadius: 12, alignItems: 'center',
    marginTop: 4, marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  footerLink:     { textAlign: 'center', fontSize: 14 },
  footerLinkBold: { fontWeight: '700' },
});