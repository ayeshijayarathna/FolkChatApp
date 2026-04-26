import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

export default function DeleteAccountScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { logout } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const gradientColors: string[] = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      const isGoogle = currentUser.providerData.some(p => p.providerId === 'google.com');
      setIsGoogleUser(isGoogle);
    }
  }, []);

  const handleDelete = async () => {
    if (isGoogleUser) {
      if (confirmText !== 'DELETE') { Alert.alert('Error', 'Please type DELETE to confirm'); return; }
    } else {
      if (!password.trim()) { Alert.alert('Error', 'Please enter your password'); return; }
    }

    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('No user');

      if (!isGoogleUser) {
        if (!currentUser.email) throw new Error('No email');
        const cred = auth.EmailAuthProvider.credential(currentUser.email, password);
        await currentUser.reauthenticateWithCredential(cred);
      }

      const uid = currentUser.uid;
      const postsSnap = await firestore().collection('posts').where('userId', '==', uid).get();
      await Promise.all(postsSnap.docs.map(doc => doc.ref.delete()));
      await firestore().collection('users').doc(uid).delete();
      await currentUser.delete();
      await logout();
    } catch (e: any) {
      setLoading(false);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else if (e.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Please log out and log in again before deleting your account.');
      } else {
        Alert.alert('Error', e.message || 'Failed to delete account');
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>{t.deleteAccountTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16 }}>

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, { backgroundColor: colors.saffron }]}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <View style={[styles.stepLine, { backgroundColor: step === 2 ? colors.saffron : colors.border }]} />
          <View style={[styles.stepDot, { backgroundColor: step === 2 ? colors.saffron : colors.border }]}>
            <Text style={styles.stepNum}>2</Text>
          </View>
        </View>

        {step === 1 ? (
          <>
            <View style={[styles.warningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="warning-outline" size={36} color={colors.saffron} />
              <Text style={[styles.warningTitle, { color: colors.darkText }]}>{t.deleteAccountStep1Title}</Text>
              <Text style={[styles.warningBody, { color: colors.muted }]}>{t.deleteAccountStep1Body}</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoTitle, { color: colors.darkText }]}>What will be deleted:</Text>
              {[
                { icon: 'images-outline', text: 'All your artwork and posts' },
                { icon: 'chatbubble-outline', text: 'All your comments' },
                { icon: 'people-outline', text: 'Your followers and following' },
                { icon: 'person-outline', text: 'Your profile and account data' },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <Ionicons name={item.icon as any} size={18} color={colors.saffron} />
                  <Text style={[styles.infoText, { color: colors.muted }]}>{item.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: colors.saffron }]}
              onPress={() => setStep(2)}>
              <Text style={styles.continueBtnText}>{t.continueBtn}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelBtnText, { color: colors.darkText }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.warningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-outline" size={32} color={colors.saffron} />
              <Text style={[styles.warningTitle, { color: colors.darkText }]}>{t.deleteAccountStep2Title}</Text>
              <Text style={[styles.warningBody, { color: colors.muted, textAlign: 'center' }]}>
                {t.deleteAccountWarningText}
              </Text>
            </View>

            {isGoogleUser ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.pwLabel, { color: colors.darkText }]}>
                  Type <Text style={{ color: colors.saffron, fontWeight: 'bold' }}>DELETE</Text> to confirm
                </Text>
                <View style={[styles.pwRow, { backgroundColor: colors.card, borderColor: confirmText === 'DELETE' ? colors.saffron : colors.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: colors.darkText }]}
                    placeholder="Type DELETE here"
                    placeholderTextColor={colors.muted}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    autoCapitalize="characters"
                    autoFocus
                  />
                  {confirmText === 'DELETE' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.saffron} />
                  )}
                </View>
                <Text style={[styles.hintText, { color: colors.muted }]}>
                  Google account — no password required
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={[styles.pwLabel, { color: colors.darkText }]}>{t.deleteAccountConfirmLabel}</Text>
                <View style={[styles.pwRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: colors.darkText }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                { backgroundColor: colors.saffron },
                loading && { opacity: 0.7 },
                (!isGoogleUser && !password) || (isGoogleUser && confirmText !== 'DELETE') ? { opacity: 0.5 } : {},
              ]}
              onPress={handleDelete}
              disabled={loading || (!isGoogleUser && !password) || (isGoogleUser && confirmText !== 'DELETE')}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.deleteBtnText}>{t.deleteAccountBtn}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => { setStep(1); setPassword(''); setConfirmText(''); }}>
              <Text style={[styles.cancelBtnText, { color: colors.darkText }]}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  stepDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepNum: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  stepLine: { flex: 1, height: 3, maxWidth: 80 },
  warningCard: { borderRadius: 16, borderWidth: 0.5, padding: 20, alignItems: 'center', gap: 10 },
  warningTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  warningBody: { fontSize: 14, lineHeight: 22 },
  infoCard: { borderRadius: 16, borderWidth: 0.5, padding: 16, gap: 12 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '500' },
  pwLabel: { fontSize: 14, fontWeight: '600' },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  hintText: { fontSize: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  deleteBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});