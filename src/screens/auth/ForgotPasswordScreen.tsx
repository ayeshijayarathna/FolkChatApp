import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
  ImageBackground, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const HEADER_H     = height * 0.35;
const ICON_SIZE    = 100;
const ICON_OVERLAP = ICON_SIZE / 2;
const ARCH_RADIUS  = width * 0.55;

export default function ForgotPasswordScreen({ navigation }: any) {
  const { isDark } = useTheme();

  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');
  const [focused, setFocused] = useState(false);

  const handleReset = async () => {
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      await auth().sendPasswordResetEmail(email);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  //Gradients
  const fullGradient = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']  
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  // Input colours 
  const inputBg        = isDark ? '#2C1F14' : '#FDF6EE';
  const inputBgFocus   = isDark ? '#3A2A1A' : '#FFFFFF';

  const inputBorderBlur   = isDark ? 'rgba(255, 255, 255, 0.18)' : '#FFFFFF';
  const inputBorderFocus  = '#D4651A';
  const inputBorderError  = '#E05252';

  const getBorderColor = () => {
    if (error) return inputBorderError;
    if (focused) return inputBorderFocus;
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
        source={require('../../../assets/images/s3.jpg')}
        style={styles.header}
        resizeMode="cover">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      </ImageBackground>

      <View style={[styles.iconWrap, { backgroundColor: cardBg, borderColor: '#FFB87A' }]}>
        <Ionicons name="lock-closed-outline" size={44} color="#D4651A" />
      </View>

      <KeyboardAvoidingView style={styles.bodyArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ height: ICON_OVERLAP + 20 }} />

          {sent ? (
            <View style={[styles.successCard, {
              backgroundColor: inputBg,
              borderColor: inputBorderBlur,
            }]}>
              <LinearGradient
                colors={['rgba(212,101,26,0.18)', 'rgba(212,101,26,0.06)']}
                style={styles.successIconWrap}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="mail-unread" size={32} color="#fff" />
                </View>
              </LinearGradient>

              <Text style={[styles.successTitle, { color: textColor }]}>Check your inbox!</Text>
              <Text style={[styles.successSub, { color: mutedColor }]}>
                We've sent password reset instructions to{'\n'}
                <Text style={{ color: '#D4651A', fontWeight: '700' }}>{email}</Text>
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
                style={styles.primaryBtnShadow}>
                <LinearGradient
                  colors={btnGradient}
                  style={styles.primaryBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.primaryBtnText}>Back to Login</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.welcomeWrap}>
                <Text style={[styles.title, { color: textColor }]}>Forgot Password?</Text>
                <Text style={[styles.subtitle, { color: mutedColor }]}>
                  Enter your email and we'll send you{'\n'}reset instructions
                </Text>
              </View>

              {error !== '' && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#E05252" />
                  <Text style={styles.errorBoxTxt}>{error}</Text>
                </View>
              )}

              <Text style={[styles.label, { color: labelColor }]}>Email</Text>
              <View style={[
                styles.inputWrap,
                {
                  backgroundColor: focused ? inputBgFocus : inputBg,
                  borderColor: getBorderColor(),
                },
                focused && styles.inputFocused,
              ]}>
                <Ionicons name="mail-outline" size={18} color={error ? '#E05252' : '#D4651A'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: focused ? inputBgFocus : inputBg }]}
                  placeholder="your@email.com"
                  placeholderTextColor={mutedColor}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
                  underlineColorAndroid="transparent"
                  selectionColor="#D4651A"
                />
              </View>

              <TouchableOpacity
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
                style={[styles.primaryBtnShadow, { marginTop: 20 }, loading && { opacity: 0.7 }]}>
                <LinearGradient
                  colors={btnGradient}
                  style={styles.primaryBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Send Reset Email</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footer}>
                <Text style={[styles.footerLink, { color: mutedColor }]}>
                  Remember your password?{' '}
                  <Text style={[styles.footerLinkBold, { color: '#D4651A' }]}>Login</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  backBtn: {
    position: 'absolute', top: 52, left: 18,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 5,
  },
  iconWrap: {
    position: 'absolute',
    top: HEADER_H - ICON_OVERLAP,
    left: (width - ICON_SIZE) / 2,
    width: ICON_SIZE, height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    borderWidth: 4, overflow: 'hidden', zIndex: 10,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  bodyArea: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingBottom: 40 },
  welcomeWrap: { alignItems: 'center', marginBottom: 26 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(224,82,82,0.12)', borderColor: 'rgba(224,82,82,0.3)',
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorBoxTxt: { color: '#E05252', fontSize: 13, flex: 1, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 0.2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1.2, height: 56,
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
  footer: { alignItems: 'center', marginTop: 6 },
  footerLink: { textAlign: 'center', fontSize: 14 },
  footerLinkBold: { fontWeight: '800' },

  successCard: {
    borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 1.2, marginTop: 8,
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#D4651A',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D4651A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  successTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 10, textAlign: 'center' },
  successSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});