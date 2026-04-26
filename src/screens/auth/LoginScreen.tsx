import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image,
  ImageBackground, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { signInWithEmail, signInWithGoogle } from '../../services/firebase';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

const HEADER_H     = height * 0.36;
const LOGO_SIZE    = 100;
const LOGO_OVERLAP = LOGO_SIZE / 2;
const ARCH_RADIUS  = width * 0.55;

export default function LoginScreen({ navigation }: any) {
  const { isDark } = useTheme();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string>('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true); setErrors({});
    try {
      await signInWithEmail(email, password);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setErrors({ general: e.message || 'Login failed' });
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setErrors({});
    try {
      await signInWithGoogle();
      navigation.replace('MainTabs');
    } catch (e: any) {
      if (e.message?.includes('DEVELOPER_ERROR')) setErrors({ general: 'Google Sign In config error.' });
      else if (e.message?.includes('SIGN_IN_CANCELLED')) setErrors({});
      else setErrors({ general: e.message || 'Google sign in failed' });
    } finally { setGoogleLoading(false); }
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
        source={require('../../../assets/images/s1.jpg')}
        style={styles.header}
        resizeMode="cover">
      </ImageBackground>

      <View style={[styles.logoWrap, { backgroundColor: cardBg, borderColor: '#FFB87A' }]}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <KeyboardAvoidingView style={styles.bodyArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ height: LOGO_OVERLAP + 20 }} />

          <View style={styles.welcomeWrap}>
            <Text style={[styles.welcome, { color: mutedColor }]}>Welcome back!</Text>
            <Text style={[styles.title, { color: textColor }]}>Sign in to continue</Text>
          </View>

          {errors.general && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#E05252" />
              <Text style={styles.errorBoxTxt}>{errors.general}</Text>
            </View>
          )}

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
              placeholder="your@email.com"
              placeholderTextColor={mutedColor}
              value={email}
              onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              underlineColorAndroid="transparent"
              selectionColor="#D4651A"
            />
          </View>
          {errors.email && <Text style={styles.errorField}>{errors.email}</Text>}

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
              placeholder="••••••••"
              placeholderTextColor={mutedColor}
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

          <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.forgotText, { color: '#D4651A' }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
            style={[styles.primaryBtnShadow, (loading || googleLoading) && { opacity: 0.7 }]}>
            <LinearGradient
              colors={btnGradient}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(212,101,26,0.22)' }]} />
            <Text style={[styles.orText, { color: mutedColor }]}>OR </Text>
            <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(212,101,26,0.22)' }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleBtn,
              {
                backgroundColor: inputBg,
                borderColor: inputBorderBlur,
              },
              (loading || googleLoading) && { opacity: 0.7 },
            ]}
            onPress={handleGoogle}
            disabled={loading || googleLoading}
            activeOpacity={0.85}>
            {googleLoading ? <ActivityIndicator color={textColor} /> : (
              <View style={styles.googleBtnInner}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={[styles.googleBtnText, { color: textColor }]}>Continue with Google </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.footer}>
            <Text style={[styles.footerLink, { color: mutedColor }]}>
              Don't have an account?{' '}
              <Text style={[styles.footerLinkBold, { color: '#D4651A' }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
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
  scroll: { paddingHorizontal: 28, paddingBottom: 40 },
  welcomeWrap: { alignItems: 'center', marginBottom: 26 },
  welcome: { fontSize: 14, marginBottom: 4, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
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
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 22 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  primaryBtnShadow: {
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    marginBottom: 22, borderRadius: 14,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17, borderRadius: 14,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  googleBtn: {
    paddingVertical: 14, borderRadius: 16, alignItems: 'center',
    marginBottom: 26, borderWidth: 1.2, minHeight: 56, justifyContent: 'center',
  },
  googleBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleBtnText: { fontSize: 15, fontWeight: '600' },
  footer: { alignItems: 'center' },
  footerLink: { textAlign: 'center', fontSize: 14 },
  footerLinkBold: { fontWeight: '800' },
});