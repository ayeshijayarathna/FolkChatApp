import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, // Added for hero illustration
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';

export default function PrivacyPolicyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();

  // Privacy policy sections from language context
  const SECTIONS = [
    { title: t.pp1Title, content: t.pp1Content },
    { title: t.pp2Title, content: t.pp2Content },
    { title: t.pp3Title, content: t.pp3Content },
    { title: t.pp4Title, content: t.pp4Content },
    { title: t.pp5Title, content: t.pp5Content },
    { title: t.pp6Title, content: t.pp6Content },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* top navigation header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.darkText }]}>{t.privacyPolicy}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* hero banner*/}
        <View style={[styles.heroBanner, { backgroundColor: colors.warmBg, borderColor: colors.border }]}>
          <Image
            source={require('../../../assets/images/faq.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <Text style={[styles.heroTitle, { color: colors.darkText }]}>{t.privacyTitle}</Text>
          <Text style={[styles.heroSub, { color: colors.muted }]}>{t.privacyUpdated}</Text>
        </View>

        {/* privacy policy section cards */}
        {SECTIONS.map((section, i) => (
          <View key={i} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.darkText }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.muted }]}>{section.content}</Text>
          </View>
        ))}

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

  heroBanner: { margin: 16, borderRadius: 16, padding: 24, borderWidth: 1, alignItems: 'center', gap: 8 },

  heroImage: { width: 140, height: 140 },
  heroTitle: { fontSize: 22, fontWeight: 'bold' },
  heroSub: { fontSize: 13 },

  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 0.5, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  sectionContent: { fontSize: 14, lineHeight: 22 },
});