import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, ScrollView,
  ActivityIndicator, Image, ImageBackground, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { signUpWithEmail, createUserProfile } from '../../services/firebase';
import { FOLK_CATEGORIES } from '../../constants/categories';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

const HEADER_H     = height * 0.30;
const LOGO_SIZE    = 100;
const LOGO_OVERLAP = LOGO_SIZE / 2;
const ARCH_RADIUS  = width * 0.55;

export default function SignUpScreen({ navigation }: any) {
  const { isDark } = useTheme();

  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [focusedField, setFocusedField]       = useState<string>('');

  type FieldErrors = { name?: string; email?: string; password?: string; confirmPassword?: string; general?: string };
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = () => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = 'Full name is required';
    else if (name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    else if (!/[A-Z]/.test(password)) e.password = 'Include one uppercase letter';
    if (!confirmPassword) e.confirmPassword = 'Please confirm password';
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

  //Gradients
  const fullGradient = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']   
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  //Input colours
  const inputBg        = isDark ? '#2C1F14' : '#FDF6EE';
  const inputBgFocus   = isDark ? '#3A2A1A' : '#FFFFFF';

  const inputBorderBlur   = isDark ? 'rgba(255, 255, 255, 0.18)' : '#FFFFFF';
  const inputBorderFocus  = '#D4651A';
  const inputBorderError  = '#E05252';

  const getInputBorder = (field: string, hasError?: boolean) => {
    if (hasError) return inputBorderError;
    if (focusedField === field) return inputBorderFocus;
    return inputBorderBlur;
  };

  const textColor   = isDark ? '#FFF6E5' : '#3D2817';
  const mutedColor  = isDark ? '#D4BCA0' : '#8A6E50';
  const labelColor  = isDark ? '#FFF6E5' : '#5C3D2E';
  const cardBg      = isDark ? '#3A2B1F' : '#FFFFFF';

  const btnGradient = ['#FFA060', '#E07830', '#D4651A'];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={fullGradient}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ImageBackground
        source={require('../../../assets/images/s2.jpg')}
        style={styles.header}
        resizeMode="cover">
      </ImageBackground>

      <View style={[styles.logoWrap, { backgroundColor: cardBg, borderColor: '#FFB87A' }]}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <KeyboardAvoidingView style={styles.bodyArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ height: LOGO_OVERLAP + 14 }} />

          <View style={styles.welcomeWrap}>
            <Text style={[styles.title, { color: textColor }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>Start your folk art journey</Text>
          </View>

          {errors.general && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#E05252" />
              <Text style={styles.errorBoxTxt}>{errors.general}</Text>
            </View>
          )}

          {/* Full Name */}
          <Text style={[styles.label, { color: labelColor }]}>Full Name</Text>
          <View style={[
            styles.inputWrap,
            {
              backgroundColor: focusedField === 'name' ? inputBgFocus : inputBg,
              borderColor: getInputBorder('name', !!errors.name),
            },
            focusedField === 'name' && styles.inputFocused,
          ]}>
            <Ionicons name="person-outline" size={18} color={errors.name ? '#E05252' : '#D4651A'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: focusedField === 'name' ? inputBgFocus : inputBg }]}
              placeholder="Your full name" placeholderTextColor={mutedColor}
              value={name}
              onChangeText={t => { setName(t); setErrors(p => ({ ...p, name: undefined })); }}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField('')}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              underlineColorAndroid="transparent"
              selectionColor="#D4651A"
            />
          </View>
          {errors.name && <Text style={styles.errorField}>{errors.name}</Text>}

          {/* Email */}
          <Text style={[styles.label, { color: labelColor }]}>Email</Text>
          <View style={[
            styles.inputWrap,
            {
              backgroundColor: focusedField === 'email' ? inputBgFocus : inputBg,
              borderColor: getInputBorder('email', !!errors.email),
            },
            focusedField === 'email' && styles.inputFocused,
          ]}>
            <Ionicons name="mail-outline" size={18} color={errors.email ? '#E05252' : '#D4651A'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: focusedField === 'email' ? inputBgFocus : inputBg }]}
              placeholder="your@email.com" placeholderTextColor={mutedColor}
              value={email}
              onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              keyboardType="email-address" autoCapitalize="none"
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              underlineColorAndroid="transparent"
              selectionColor="#D4651A"
            />
          </View>
          {errors.email && <Text style={styles.errorField}>{errors.email}</Text>}

          {/* Artist Category */}
          <Text style={[styles.label, { color: labelColor }]}>Artist Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            {FOLK_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.85}>
                  {isSelected ? (
                    <LinearGradient
                      colors={['#FFA060', '#D4651A']}
                      style={[styles.chip, styles.chipSelected]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={styles.chipTextSelected}>{cat}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.chip, { backgroundColor: inputBg, borderColor: inputBorderBlur }]}>
                      <Text style={[styles.chipText, { color: textColor }]}>{cat}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Password */}
          <Text style={[styles.label, { color: labelColor }]}>Password</Text>
          <View style={[
            styles.inputWrap,
            {
              backgroundColor: focusedField === 'password' ? inputBgFocus : inputBg,
              borderColor: getInputBorder('password', !!errors.password),
            },
            focusedField === 'password' && styles.inputFocused,
          ]}>
            <Ionicons name="lock-closed-outline" size={18} color={errors.password ? '#E05252' : '#D4651A'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: focusedField === 'password' ? inputBgFocus : inputBg }]}
              placeholder="••••••••" placeholderTextColor={mutedColor}
              value={password}
              onChangeText={t => { setPassword(t); setErrors(p => ({ ...p, password: undefined })); }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              secureTextEntry={!showPassword}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              underlineColorAndroid="transparent"
              selectionColor="#D4651A"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={mutedColor} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorField}>{errors.password}</Text>}

          {/* Confirm Password */}
          <Text style={[styles.label, { color: labelColor }]}>Confirm Password</Text>
          <View style={[
            styles.inputWrap,
            {
              backgroundColor: focusedField === 'confirmPassword' ? inputBgFocus : inputBg,
              borderColor: getInputBorder('confirmPassword', !!errors.confirmPassword),
            },
            focusedField === 'confirmPassword' && styles.inputFocused,
          ]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={errors.confirmPassword ? '#E05252' : '#D4651A'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: focusedField === 'confirmPassword' ? inputBgFocus : inputBg }]}
              placeholder="••••••••" placeholderTextColor={mutedColor}
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setErrors(p => ({ ...p, confirmPassword: undefined })); }}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField('')}
              secureTextEntry={!showPassword}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              underlineColorAndroid="transparent"
              selectionColor="#D4651A"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={mutedColor} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorField}>{errors.confirmPassword}</Text>}

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
            style={[styles.primaryBtnShadow, loading && { opacity: 0.7 }]}>
            <LinearGradient
              colors={btnGradient}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footer}>
            <Text style={[styles.footerLink, { color: mutedColor }]}>
              Already have an account?{' '}
              <Text style={[styles.footerLinkBold, { color: '#D4651A' }]}>Sign In</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    width, height: HEADER_H,
    borderBottomLeftRadius: ARCH_RADIUS,
    borderBottomRightRadius: ARCH_RADIUS,
    overflow: 'hidden',
  },
  logoWrap: {
    position: 'absolute',
    top: HEADER_H - LOGO_OVERLAP,
    left: (width - LOGO_SIZE) / 2,
    width: LOGO_SIZE, height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 4, overflow: 'hidden', zIndex: 10,
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  logo: { width: '100%', height: '100%' },
  bodyArea: { flex: 1 },
  scroll: { paddingHorizontal: 28 },
  welcomeWrap: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(224,82,82,0.12)', borderColor: 'rgba(224,82,82,0.3)',
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorBoxTxt: { color: '#E05252', fontSize: 13, flex: 1, fontWeight: '500' },
  errorField: { color: '#E05252', fontSize: 12, marginTop: -8, marginBottom: 12, marginLeft: 4 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 0.2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, marginBottom: 16, borderWidth: 1.2, height: 56,
    shadowColor: '#D4651A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  inputFocused: {
    shadowColor: '#D4651A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.5,
  },
  inputIcon: { paddingLeft: 16, paddingRight: 10 },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    fontWeight: '500',
    height: '100%',
  },
  eyeBtn: { padding: 14 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, marginRight: 8, borderWidth: 1.2,
  },
  chipSelected: {
    borderWidth: 0,
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#fff', fontWeight: '700', fontSize: 13 },
  primaryBtnShadow: {
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    marginTop: 8, marginBottom: 22, borderRadius: 14,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17, borderRadius: 14,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  footer: { alignItems: 'center' },
  footerLink: { textAlign: 'center', fontSize: 14 },
  footerLinkBold: { fontWeight: '800' },
});