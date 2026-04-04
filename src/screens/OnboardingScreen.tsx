import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  TouchableOpacity, Dimensions, ScrollView,
} from 'react-native';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    title: 'Discover Folk Arts',
    desc: 'Explore 28+ traditional Sri Lankan art categories — from Batik to Beeralu Lace',
  },
  {
    title: 'Connect with Artists',
    desc: 'Follow folk artists, message them directly, and build your art community',
  },
  {
    title: 'Share Your Craft',
    desc: 'Upload your artwork, gain followers, and track your performance with analytics',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      navigation.replace('Auth');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/splash_bg.png')}
      style={styles.bg}
      resizeMode="cover">
      <View style={styles.overlay}>
        <View style={styles.top}></View>

        <View style={styles.card}>
          <Text style={styles.title}>{slides[current].title}</Text>
          <Text style={styles.desc}>{slides[current].desc}</Text>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={next}>
            <Text style={styles.btnText}>
              {current === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>

          {current < slides.length - 1 && (
            <TouchableOpacity onPress={() => navigation.replace('Auth')}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  top: { alignItems: 'center' },
  brand: { fontSize: 32, fontWeight: 'bold', color: COLORS.white, letterSpacing: 2 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.warmBg,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.earth, marginBottom: 16 },
  desc: { fontSize: 15, color: COLORS.muted, lineHeight: 24, marginBottom: 32 },
  dots: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: COLORS.saffron, width: 24 },
  button: {
    backgroundColor: COLORS.saffron,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  skip: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 14 },
});