import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';

export default function NotificationsScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Ionicons name="notifications-outline" size={48} color={COLORS.muted} />
        <Text style={styles.text}>Notifications</Text>
        <Text style={styles.sub}>No notifications yet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.offwhite },
  back: { position: 'absolute', top: 52, left: 16, zIndex: 10, padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { fontSize: 22, fontWeight: 'bold', color: COLORS.darkText },
  sub: { fontSize: 15, color: COLORS.muted },
});