import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, 
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { COLORS } from '../../constants/colors';

export default function AboutScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();

  const features = [
    { icon: 'images-outline' as const, text: t.aboutF1 },
    { icon: 'people-outline' as const, text: t.aboutF2 },
    { icon: 'heart-outline' as const, text: t.aboutF3 },
    { icon: 'chatbubble-outline' as const, text: t.aboutF4 },
    { icon: 'search-outline' as const, text: t.aboutF5 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* top navigation header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.darkText }]}>{t.aboutFolkChat}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* hero banner*/}
        <View style={[styles.heroBanner, { backgroundColor: colors.warmBg, borderColor: colors.border }]}>
          <Image
            source={require('../../../assets/images/about.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>FolkChat</Text>
          <Text style={styles.tagline}>{t.aboutTagline}</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>{t.aboutVersion}</Text>
          </View>
        </View>

        {/* mission statement card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.darkText }]}>{t.aboutMissionTitle}</Text>
          <Text style={[styles.cardText, { color: colors.muted }]}>{t.aboutMissionText}</Text>
        </View>

        {/* features list card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.darkText }]}>{t.aboutFeaturesTitle}</Text>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon} size={20} color={colors.saffron} />
              <Text style={[styles.featureText, { color: colors.darkText }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.darkText }]}>{t.aboutContactTitle}</Text>
          <Text style={[styles.cardText, { color: colors.muted }]}>info@folkchat.app</Text>
          <Text style={[styles.cardText, { color: colors.muted }]}>www.folkchat.app</Text>
        </View>

        <Text style={[styles.copyright, { color: colors.muted }]}>{t.aboutCopyright}</Text>

        <View style={{ height: 40 }} />
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
  title: { fontSize: 18, fontWeight: 'bold' },
  heroBanner: { margin: 16, borderRadius: 20, padding: 32, alignItems: 'center', gap: 8 },
  heroImage: { width: 140, height: 140, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: 'bold', color:COLORS.saffron},
  tagline: { fontSize: 14, color:COLORS.rust, textAlign: 'center' },
  versionBadge: {
    backgroundColor: 'rgba(175, 145, 113, 0.25)',
    borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 6, marginTop: 8,
  },
  versionText: { color:COLORS.darkText, fontSize: 13, fontWeight: '600' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 0.5, padding: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  cardText: { fontSize: 14, lineHeight: 22, marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  featureText: { fontSize: 15 },
  copyright: { textAlign: 'center', fontSize: 13, padding: 16 },
});