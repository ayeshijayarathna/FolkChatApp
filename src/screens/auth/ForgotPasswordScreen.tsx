import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
  ImageBackground, StatusBar, Image,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import Ionicons from '@react-native-vector-icons/ionicons';

const { width, height } = Dimensions.get('window');

const HEADER_H     = height * 0.35;
const ICON_SIZE    = 96;
const ICON_OVERLAP = ICON_SIZE / 2;
const ARCH_RADIUS  = width * 0.55;

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

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

  const inputBg = isDark ? colors.inputBg : 'rgba(255,255,255,0.92)';
  const cardBg  = isDark ? colors.card    : colors.bg;

  return (
    <View style={[styles.root, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/*arch header */}
      <ImageBackground
        source={require('../../../assets/images/s3.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={[styles.headerScrim, isDark && styles.headerScrimDark]} />

      </ImageBackground>

      {/*lock icon*/}
      <View style={[styles.iconWrap, { backgroundColor: cardBg, borderColor: colors.saffron }]}>
        <Ionicons name="lock-closed-outline" size={44} color={colors.saffron} />
      </View>

      {/*body*/}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: ICON_OVERLAP + 16 }} />

          <Text style={[styles.cardTitle, { color: colors.darkText }]}>Forgot Password?</Text>
          <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
            Enter your email and we'll send you reset instructions
          </Text>

          {/* success*/}
          {sent ? (
            <View style={[styles.successBox, { backgroundColor: isDark ? 'rgba(212,101,26,0.12)' : 'rgba(212,101,26,0.08)', borderColor: colors.saffron }]}>
              <View style={[styles.successIconCircle, { backgroundColor: isDark ? 'rgba(212,101,26,0.2)' : 'rgba(212,101,26,0.12)' }]}>
                <Ionicons name="mail-unread-outline" size={36} color={colors.saffron} />
              </View>
              <Text style={[styles.successTitle, { color: colors.darkText }]}>Check your inbox!</Text>
              <Text style={[styles.successSub, { color: colors.muted }]}>
                We've sent password reset instructions to{'\n'}
                <Text style={{ color: colors.saffron, fontWeight: '700' }}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.saffron }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Error */}
              {error !== '' && (
                <Text style={[styles.errorGeneral, { backgroundColor: isDark ? 'rgba(224,82,82,0.15)' : 'rgba(224,82,82,0.08)' }]}>
                  {error}
                </Text>
              )}

              {/* Email input */}
              <View style={[
                styles.inputWrap,
                { backgroundColor: inputBg, borderColor: error ? '#E05252' : colors.border },
                error !== '' && styles.inputWrapError,
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={error ? '#E05252' : colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.darkText }]}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.saffron }, loading && { opacity: 0.7 }]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Send Reset Email</Text>}
              </TouchableOpacity>

              {/* Footer */}
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.footerLink, { color: colors.muted }]}>
                  Remember your password?{' '}
                  <Text style={[styles.footerLinkBold, { color: colors.saffron }]}>Login</Text>
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
    justifyContent: 'flex-end',
    paddingBottom: ICON_OVERLAP + 20,
    paddingHorizontal: 28,
    borderBottomLeftRadius: ARCH_RADIUS,
    borderBottomRightRadius: ARCH_RADIUS,
    overflow: 'hidden',
  },
  headerScrim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,12,4,0.30)' },
  headerScrimDark: { backgroundColor: 'rgba(0,0,0,0.50)' },

  iconWrap: {
    position: 'absolute',
    top: HEADER_H - ICON_OVERLAP,
    left: (width - ICON_SIZE) / 2,
    width: ICON_SIZE, height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    borderWidth: 3, overflow: 'hidden', zIndex: 10,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },

  scroll: { paddingHorizontal: 28, paddingBottom: 40 },

  cardTitle: {
    fontSize: 28, fontWeight: '800', letterSpacing: -0.5,
    textAlign: 'center', marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14, textAlign: 'center',
    marginBottom: 24, lineHeight: 20,
  },

  errorGeneral: {
    color: '#E05252', fontSize: 13, marginBottom: 14,
    textAlign: 'center', padding: 10, borderRadius: 8,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, marginBottom: 20, borderWidth: 1,
  },
  inputWrapError: { borderColor: '#E05252' },
  inputIcon: { paddingLeft: 14, paddingRight: 8 },
  input: { flex: 1, paddingVertical: 14, paddingRight: 12, fontSize: 14 },

  primaryBtn: {
    paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  footerLink:     { textAlign: 'center', fontSize: 14 },
  footerLinkBold: { fontWeight: '700' },

  successBox: {
    borderRadius: 20, padding: 28, alignItems: 'center',
    borderWidth: 1, marginTop: 8,
  },
  successIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.3,
    marginBottom: 10, textAlign: 'center',
  },
  successSub: {
    fontSize: 14, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
});