import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';

export default function AnalyticsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.darkText} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Ionicons name="analytics-outline" size={48} color={colors.muted} />
        <Text style={[styles.text, { color: colors.darkText }]}>{t.analytics}</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { position: 'absolute', top: 52, left: 16, zIndex: 10, padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { fontSize: 22, fontWeight: 'bold' },
  sub: { fontSize: 15 },
});