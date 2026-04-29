import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Image, Modal, Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useLang, Lang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

const LANGUAGES: Lang[] = ['English', 'Sinhala', 'Tamil'];

const CHAT_THEMES = [
  { id: 'default',  label: 'Default',  bg: '#F0EBE3', preview: '#F0EBE3' },
  { id: 'dark',     label: 'Dark',     bg: '#1a1a2e', preview: '#1a1a2e' },
  { id: 'ocean',    label: 'Ocean',    bg: '#dbeeff', preview: '#dbeeff' },
  { id: 'forest',   label: 'Forest',   bg: '#dff2e1', preview: '#dff2e1' },
  { id: 'sunset',   label: 'Sunset',   bg: '#fff0e0', preview: '#fff0e0' },
  { id: 'lavender', label: 'Lavender', bg: '#f0e5f5', preview: '#f0e5f5' },
];

export default function SettingsScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLang();
  const { user, userProfile, logout } = useAuthStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedChatTheme, setSelectedChatTheme] = useState('default');
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('chatTheme').then(val => { if (val) setSelectedChatTheme(val); });
    AsyncStorage.getItem('chatCustomBg').then(val => { if (val) setCustomBg(val); });
  }, []);

  const saveChatTheme = async (themeId: string, customUri?: string | null) => {
    setSelectedChatTheme(themeId);
    await AsyncStorage.setItem('chatTheme', themeId);
    if (customUri !== undefined) {
      setCustomBg(customUri);
      if (customUri) await AsyncStorage.setItem('chatCustomBg', customUri);
      else await AsyncStorage.removeItem('chatCustomBg');
    }
    setShowThemeModal(false);
  };

  const handleLogout = () => {
    Alert.alert(t.logout, 'Are you sure?', [
      { text: t.cancel, style: 'cancel' },
      { text: t.logout, style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const pickCustomBg = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) {
      await saveChatTheme('custom', result.assets[0].uri);
    }
  };

  const currentThemeBg = CHAT_THEMES.find(x => x.id === selectedChatTheme)?.bg || '#F0EBE3';

const gradientColors: string[] = isDark
  ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
  : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  const MenuItem = ({ icon, label, onPress, rightContent, danger }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.iconBox, { backgroundColor: danger ? '#FFF0F0' : colors.warmBg }]}>
          <Ionicons name={icon} size={18} color={danger ? '#FF4444' : colors.saffron} />
        </View>
        <Text style={[styles.menuLabel, { color: danger ? '#FF4444' : colors.darkText }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {rightContent}
        <Ionicons name="chevron-forward" size={16} color={danger ? '#FF4444' : colors.muted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Login screen eke wagema gradient background */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>

        <Text style={[styles.title, { color: colors.darkText }]}>{t.settings_title}</Text>

        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('UserProfile', { userId: user?.uid })}>
          {userProfile?.avatarUrl ? (
            <Image source={{ uri: userProfile.avatarUrl }} style={[styles.profileAvatar, { borderColor: colors.saffron }]} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: colors.warmBg, borderColor: colors.saffron }]}>
              <Ionicons name="person" size={28} color={colors.saffron} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.darkText }]}>{userProfile?.name || 'Your Name'}</Text>
            <Text style={[styles.profileSub, { color: colors.saffron }]}>{userProfile?.artistCategory || 'Folk Artist'}</Text>
            <Text style={[styles.profileEmail, { color: colors.muted }]}>{user?.email || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t.account}</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="create-outline" label={t.editProfile}
            onPress={() => navigation.navigate('EditProfile')} rightContent={null} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="analytics-outline" label={t.viewAnalytics}
            onPress={() => navigation.navigate('Analytics')} rightContent={null} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="lock-closed-outline" label={t.changePassword}
            onPress={() => navigation.navigate('ChangePassword')} rightContent={null} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="trash-outline" label={t.deleteAccount}
            onPress={() => navigation.navigate('DeleteAccount')} rightContent={null} />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t.preferences}</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Dark mode */}
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warmBg }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={18} color={colors.saffron} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.darkText }]}>{t.darkMode}</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.saffron }} thumbColor={colors.white} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Notifications */}
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warmBg }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.saffron} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.darkText }]}>{t.notifications}</Text>
            </View>
            <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.saffron }} thumbColor={colors.white} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Language */}
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warmBg }]}>
                <Ionicons name="globe-outline" size={18} color={colors.saffron} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.darkText }]}>{t.language}</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={[styles.menuRightText, { color: colors.muted }]}>{language}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Chat Theme */}
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowThemeModal(true)}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warmBg }]}>
                <Ionicons name="color-palette-outline" size={18} color={colors.saffron} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.darkText }]}>{t.chatTheme}</Text>
            </View>
            <View style={styles.menuRight}>
              {customBg && selectedChatTheme === 'custom' ? (
                <Image source={{ uri: customBg }} style={styles.themePreviewImg} />
              ) : (
                <View style={[styles.themePreviewDot, {
                  backgroundColor: currentThemeBg, borderColor: colors.border,
                }]} />
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t.support}</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="help-circle-outline" label={t.helpCenter}
            onPress={() => navigation.navigate('HelpCenter')} rightContent={null} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="shield-outline" label={t.privacyPolicy}
            onPress={() => navigation.navigate('PrivacyPolicy')} rightContent={null} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="information-circle-outline" label={t.aboutFolkChat}
            onPress={() => navigation.navigate('About')} rightContent={null} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.card }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4444" />
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        {/* Language Modal */}
        <Modal visible={showLanguageModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.darkText }]}>{t.language}</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Ionicons name="close" size={24} color={colors.darkText} />
                </TouchableOpacity>
              </View>
              {LANGUAGES.map(lang => (
                <TouchableOpacity key={lang}
                  style={[styles.optionItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}>
                  <View style={styles.optionLeft}>
                    <Ionicons name="globe-outline" size={22} color={language === lang ? colors.saffron : colors.muted} />
                    <View>
                      <Text style={[styles.optionLabel, { color: language === lang ? colors.saffron : colors.darkText },
                        language === lang && { fontWeight: '700' }]}>
                        {lang}
                      </Text>
                      {lang === 'Sinhala' && <Text style={[styles.optionSub, { color: colors.muted }]}>සිංහල</Text>}
                      {lang === 'Tamil'   && <Text style={[styles.optionSub, { color: colors.muted }]}>தமிழ்</Text>}
                    </View>
                  </View>
                  {language === lang && <Ionicons name="checkmark-circle" size={22} color={colors.saffron} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: 30 }} />
            </View>
          </View>
        </Modal>

        {/* Chat Theme Modal */}
        <Modal visible={showThemeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.darkText }]}>{t.chatTheme}</Text>
                <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.darkText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subLabel, { color: colors.muted }]}>Color Themes</Text>
              <View style={styles.themeGrid}>
                {CHAT_THEMES.map(theme => {
                  const isSelected = selectedChatTheme === theme.id;
                  return (
                    <TouchableOpacity key={theme.id} style={styles.themeItem}
                      onPress={() => saveChatTheme(theme.id, null)}>
                      <View style={[styles.themeCircle,
                        { backgroundColor: theme.bg, borderColor: isSelected ? colors.saffron : colors.border },
                        isSelected && { borderWidth: 3 }]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color={theme.id === 'dark' ? '#fff' : '#333'} />
                        )}
                      </View>
                      <Text style={[styles.themeLabel, { color: isSelected ? colors.saffron : colors.muted }]}>
                        {theme.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.subLabel, { color: colors.muted }]}>Custom Wallpaper</Text>
              <TouchableOpacity style={[styles.customBgBtn, {
                borderColor: selectedChatTheme === 'custom' ? colors.saffron : colors.border,
                borderWidth: selectedChatTheme === 'custom' ? 2 : 1,
              }]} onPress={pickCustomBg}>
                {customBg && selectedChatTheme === 'custom' ? (
                  <Image source={{ uri: customBg }} style={styles.customBgPreview} />
                ) : (
                  <View style={[styles.customBgPlaceholder, { backgroundColor: colors.warmBg }]}>
                    <Ionicons name="image-outline" size={28} color={colors.saffron} />
                    <Text style={[styles.customBgText, { color: colors.saffron }]}>Choose from Gallery</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 0.5 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  profileName: { fontSize: 16, fontWeight: 'bold' },
  profileSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  profileEmail: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginHorizontal: 24, marginBottom: 8 },
  section: { marginHorizontal: 16, borderRadius: 16, marginBottom: 24, borderWidth: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuRightText: { fontSize: 13 },
  divider: { height: 0.5, marginLeft: 64 },
  themePreviewDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  themePreviewImg: { width: 22, height: 22, borderRadius: 11 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#FFCCCC' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 0.5 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionLabel: { fontSize: 16 },
  optionSub: { fontSize: 13, marginTop: 2 },
  subLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  themeItem: { alignItems: 'center', width: 80 },
  themeCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  themeLabel: { fontSize: 11, textAlign: 'center' },
  customBgBtn: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', height: 100 },
  customBgPreview: { width: '100%', height: '100%' },
  customBgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  customBgText: { fontSize: 14, fontWeight: '500' },
});