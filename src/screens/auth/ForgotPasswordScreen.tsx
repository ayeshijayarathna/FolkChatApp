import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ImageBackground, Dimensions, ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../../constants/colors';
import Ionicons from '@react-native-vector-icons/ionicons'; 

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // handle password reset email submission
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

  return (
    <ImageBackground
      source={require('../../../assets/images/login1.png')}
      style={styles.bg}
      resizeMode="cover">

      <View style={styles.overlay}>
        <View style={styles.container}>

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={48} color={COLORS.saffron} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>Enter your email to reset your password</Text>
          </View>

          <View style={styles.card}>

            {sent ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Reset email sent!</Text>
                <Text style={styles.successSub}>Check your inbox and follow the instructions</Text>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
  
                {error !== '' && <Text style={styles.error}>{error}</Text>}

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

                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleReset}
                  disabled={loading}>
                  {loading
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.resetBtnText}>Send Reset Email</Text>}
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  overlay: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 60, left: 24 },
  backText: { color: COLORS.saffron, fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },

  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.saffron, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: COLORS.darkText, textAlign: 'center' },

  card: {
    backgroundColor: 'rgba(42, 32, 3, 0.13)',
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: 'rgba(88, 63, 6, 0.25)',
  },

  error: { color: '#FF6B6B', textAlign: 'center', fontSize: 13, marginBottom: 12 },

  label: { color: COLORS.darkText, fontSize: 14, marginBottom: 8, fontWeight: '500' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.darkText, marginBottom: 20,
  },

  resetBtn: {
    backgroundColor: COLORS.saffron,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  resetBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  successBox: { alignItems: 'center', paddingVertical: 16 },
  successText: { fontSize: 22, fontWeight: 'bold', color: COLORS.white, marginBottom: 12 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24 },
  loginBtn: { backgroundColor: COLORS.saffron, padding: 14, borderRadius: 12, paddingHorizontal: 32 },
  loginBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});