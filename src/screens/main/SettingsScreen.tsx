import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen({ navigation }: any) {
  const { user, userProfile, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => { await logout(); },
        },
      ]
    );
  };

  const MenuItem = ({ icon, label, onPress, color = COLORS.darkText, rightText = '' }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.iconBox, { backgroundColor: COLORS.warmBg }]}>
          <Ionicons name={icon} size={18} color={COLORS.saffron} />
        </View>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {rightText ? <Text style={styles.menuRightText}>{rightText}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile Card */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={28} color={COLORS.saffron} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{userProfile?.name || 'Your Name'}</Text>
          <Text style={styles.profileCategory}>{userProfile?.artistCategory || 'Folk Artist'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
      </TouchableOpacity>

      {/* Account */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <View style={styles.section}>
        <MenuItem icon="person-outline" label="Edit Profile"
          onPress={() => navigation.navigate('EditProfile')} />
        <View style={styles.divider} />
        <MenuItem icon="analytics-outline" label="View Analytics"
          onPress={() => navigation.navigate('Analytics')} />
        <View style={styles.divider} />
        <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>PREFERENCES</Text>
      <View style={styles.section}>
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <View style={styles.divider} />
        <MenuItem icon="globe-outline" label="Language" rightText="English" onPress={() => {}} />
      </View>

      {/* Support */}
      <Text style={styles.sectionTitle}>SUPPORT</Text>
      <View style={styles.section}>
        <MenuItem icon="help-circle-outline" label="Help Center" onPress={() => {}} />
        <View style={styles.divider} />
        <MenuItem icon="shield-outline" label="Privacy Policy" onPress={() => {}} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF4444" />
        <Text style={styles.logoutText}>Logout </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.offwhite },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.darkText, padding: 24, paddingBottom: 16 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.white, marginHorizontal: 16,
    borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 0.5, borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.warmBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.saffron,
  },
  profileName: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  profileCategory: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1, marginHorizontal: 24, marginBottom: 8,
  },
  section: {
    backgroundColor: COLORS.white, marginHorizontal: 16,
    borderRadius: 16, marginBottom: 24,
    borderWidth: 0.5, borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuRightText: { fontSize: 13, color: COLORS.muted },
  divider: { height: 0.5, backgroundColor: COLORS.border, marginLeft: 62 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.white, marginHorizontal: 16,
    borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#FFCCCC',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FF4444' },
});