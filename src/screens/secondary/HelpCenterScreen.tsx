import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { COLORS } from '../../constants/colors';

export default function HelpCenterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const [expanded, setExpanded] = useState<number | null>(null);

  const gradientColors: string[] = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  const FAQ = [
    { q: t.faqQ1, a: t.faqA1 },
    { q: t.faqQ2, a: t.faqA2 },
    { q: t.faqQ3, a: t.faqA3 },
    { q: t.faqQ4, a: t.faqA4 },
    { q: t.faqQ5, a: t.faqA5 },
    { q: t.faqQ6, a: t.faqA6 },
    { q: t.faqQ7, a: t.faqA7 },
  ];

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
        <Text style={[styles.title, { color: colors.darkText }]}>{t.helpCenter}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: 'transparent' }}>

        <View style={[styles.heroBanner]}>
          <Image
            source={require('../../../assets/images/stillhelp.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>{t.helpHeroTitle}</Text>
          <Text style={styles.heroSub}>{t.helpHeroSub}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t.faqSectionTitle}</Text>

        {FAQ.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.8}>
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQ, { color: colors.darkText }]}>{item.q}</Text>
              <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </View>
            {expanded === i && (
              <Text style={[styles.faqA, { color: colors.muted }]}>{item.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 8 }]}>
          ACCOUNT MANAGEMENT
        </Text>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DeleteAccount')}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warmBg }]}>
                <Ionicons name="trash-outline" size={18} color={colors.saffron} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.darkText }]}>{t.deleteAccount}</Text>
                <Text style={[styles.menuSub, { color: colors.muted }]}>Permanently remove your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={require('../../../assets/images/help.png')}
            style={styles.contactImage}
            resizeMode="contain"
          />
          <Text style={[styles.contactTitle, { color: colors.darkText }]}>{t.stillNeedHelp}</Text>
          <Text style={[styles.contactSub, { color: colors.muted }]}>{t.contactEmail}</Text>
        </View>

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
  heroBanner: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  heroImage: { width: 120, height: 120 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.saffron, textAlign: 'center' },
  heroSub: { fontSize: 14, color: COLORS.rust, textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginHorizontal: 24, marginBottom: 8, marginTop: 8 },
  faqItem: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 0.5, padding: 16 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  faqQ: { fontSize: 15, fontWeight: '600', flex: 1 },
  faqA: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  section: { marginHorizontal: 16, borderRadius: 16, marginBottom: 16, borderWidth: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuSub: { fontSize: 12, marginTop: 2 },
  contactCard: { margin: 16, borderRadius: 16, borderWidth: 0.5, padding: 24, alignItems: 'center', gap: 8 },
  contactImage: { width: 100, height: 100 },
  contactTitle: { fontSize: 18, fontWeight: 'bold' },
  contactSub: { fontSize: 14, textAlign: 'center' },
});