import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';

export default function ChangePasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();

  // password field states
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // loading state
  const [loading, setLoading] = useState(false);

  // show/hide toggle states for each password field
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // handle password change submission
  const handleChange = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert(t.errorTitle, t.changePwFillAll); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert(t.errorTitle, t.changePwNoMatch); return;
    }
    if (newPw.length < 6) {
      Alert.alert(t.errorTitle, t.changePwTooShort); return;
    }
    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user || !user.email) throw new Error('No user');

      // re-authenticate user before changing password
      const cred = auth.EmailAuthProvider.credential(user.email, currentPw);
      await user.reauthenticateWithCredential(cred);

      await user.updatePassword(newPw);
      Alert.alert(t.changePwSuccess, t.changePwSuccessMsg, [
        { text: t.okBtn, onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert(t.errorTitle, e.message || t.changePwFailed);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      label: t.changePwCurrentLabel,
      value: currentPw,
      set: setCurrentPw,
      show: showCurrent,
      toggle: setShowCurrent,
    },
    {
      label: t.changePwNewLabel,
      value: newPw,
      set: setNewPw,
      show: showNew,
      toggle: setShowNew,
    },
    {
      label: t.changePwConfirmLabel,
      value: confirmPw,
      set: setConfirmPw,
      show: showConfirm,
      toggle: setShowConfirm,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.darkText }]}>{t.changePassword}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.imageWrapper}>
          <Image
            source={require('../../../assets/images/changepw.png')}
            style={styles.headerImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.form}>

          {fields.map((field, i) => (
            <View key={i} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.darkText }]}>{field.label}</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.darkText }]}
                  value={field.value}
                  onChangeText={field.set}
                  secureTextEntry={!field.show}
                  placeholderTextColor={colors.muted}
                  placeholder={t.changePwPlaceholder}
                />
                <TouchableOpacity onPress={() => field.toggle(!field.show)}>
                  <Ionicons
                    name={field.show ? 'eye-off-outline' : 'eye-outline'}
                    size={20} color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* submit button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.saffron }, loading && { opacity: 0.7 }]}
            onPress={handleChange}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{t.changePwUpdateBtn}</Text>}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  title: { fontSize: 18, fontWeight: 'bold' },

  scroll: { flexGrow: 1, paddingBottom: 40 },

  imageWrapper: { alignItems: 'center', paddingTop: 24 },
  headerImage: {
    width: 180,
    height: 180,
  },

  form: { padding: 20 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },

  btn: {
    padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});