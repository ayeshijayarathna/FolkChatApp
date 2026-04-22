import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image,
  ImageBackground, StatusBar,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { signInWithEmail, signInWithGoogle } from '../../services/firebase';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

const HEADER_H     = height * 0.35;
const LOGO_SIZE    = 96;
const LOGO_OVERLAP = LOGO_SIZE / 2;
const ARCH_RADIUS  = width * 0.55;
const LOGO_BOTTOM  = HEADER_H - LOGO_OVERLAP + LOGO_SIZE;

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())
      e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Enter a valid email address';
    if (!password)
      e.password = 'Password is required';
    else if (password.length < 6)
      e.password = 'Password must be at least 6 characters';
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
      if (e.message?.includes('DEVELOPER_ERROR'))
        setErrors({ general: 'Google Sign In config error. Please check setup.' });
      else if (e.message?.includes('SIGN_IN_CANCELLED'))
        setErrors({});
      else
        setErrors({ general: e.message || 'Google sign in failed' });
    } finally { setGoogleLoading(false); }
  };
 
  const inputBg     = isDark ? colors.inputBg : 'rgba(255,255,255,0.92)';
  const googleBtnBg = isDark ? colors.inputBg : 'rgba(255,255,255,0.92)';
  const cardBg      = isDark ? colors.card    : colors.bg;

  const LABEL_BLOCK_H = 30 + 4 + 17 + 4 + 22 + 20;
  return (
    <View style={[styles.root, { backgroundColor: cardBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* arch header */}
      <ImageBackground
        source={require('../../../assets/images/s1.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={[styles.headerScrim, isDark && styles.headerScrimDark]} />
      </ImageBackground>

      {/* logo*/}
      <View style={[styles.logoWrap, { backgroundColor: cardBg, borderColor: colors.saffron }]}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      {/*labels */}
      <View style={[styles.labelsWrap, { top: LOGO_BOTTOM + 10 }]}>
        <Text style={[styles.welcome, { color: colors.muted }]}>Welcome back !!</Text>
        <Text style={[styles.screenLabel, { color: colors.saffron }]}>SIGN IN </Text>
      </View>

      {/*body*/}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

          {/* Email */}
          <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: errors.email ? '#E05252' : colors.border },
            errors.email && styles.inputWrapError]}>
            <Ionicons name="mail-outline" size={18} color={errors.email ? '#E05252' : colors.muted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.darkText }]}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email && <Text style={styles.errorField}>{errors.email}</Text>}

          {/* Password */}
          <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: errors.password ? '#E05252' : colors.border },
            errors.password && styles.inputWrapError]}>
            <Ionicons name="lock-closed-outline" size={18} color={errors.password ? '#E05252' : colors.muted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1, color: colors.darkText }]}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={t => { setPassword(t); setErrors(p => ({ ...p, password: undefined })); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorField}>{errors.password}</Text>}

          <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.forgotText, { color: colors.muted }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.saffron }, (loading || googleLoading) && { opacity: 0.7 }]}
            onPress={handleLogin} disabled={loading || googleLoading} activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Login</Text>}
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.muted }]}>OR</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: googleBtnBg, borderColor: colors.border }, (loading || googleLoading) && { opacity: 0.7 }]}
            onPress={handleGoogle} disabled={loading || googleLoading} activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.darkText} />
            ) : (
              <View style={styles.googleBtnInner}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={[styles.googleBtnText, { color: colors.darkText }]}>Continue with Google </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.footerLink, { color: colors.muted }]}>
              Don't have an account?{' '}
              <Text style={[styles.footerLinkBold, { color: colors.saffron }]}>Sign Up</Text>
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
  welcome:     { fontSize: 14, marginTop: 2, marginBottom: 4 },
  screenLabel: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },

  scroll: { paddingHorizontal: 28, paddingBottom: 40 },

  errorGeneral: { color: '#E05252', fontSize: 13, marginBottom: 14, textAlign: 'center', padding: 10, borderRadius: 8 },
  errorField:   { color: '#E05252', fontSize: 12, marginTop: -4, marginBottom: 10, marginLeft: 4 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, marginBottom: 6, borderWidth: 1,
  },
  inputWrapError: { borderColor: '#E05252' },
  inputIcon: { paddingLeft: 14, paddingRight: 8 },
  input:     { flex: 1, paddingVertical: 14, paddingRight: 12, fontSize: 14 },
  eyeBtn:    { padding: 12 },

  forgot:     { alignSelf: 'flex-end', marginBottom: 22 },
  forgotText: { fontSize: 13 },

  primaryBtn: {
    paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  orRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12 },

  googleBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    marginBottom: 26, borderWidth: 1, minHeight: 50, justifyContent: 'center',
  },
  googleBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleBtnText:  { fontSize: 15, fontWeight: '600' },

  footerLink:     { textAlign: 'center', fontSize: 14 },
  footerLinkBold: { fontWeight: '700' },
});