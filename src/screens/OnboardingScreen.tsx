import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, Image, StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const ARCH_HEIGHT = height * 0.56;
const ARCH_RADIUS = width * 0.48;

const slides = [
  {
    title: 'Discover Folk Arts',
    desc: 'Explore traditional Sri Lankan art categories from Batik to Beeralu Lace',
    image: require('../../assets/images/1.jpg'),
  },
  {
    title: 'Connect with Artists',
    desc: 'Follow folk artists, message them directly, and build your art community',
    image: require('../../assets/images/2.jpg'),
  },
  {
    title: 'Share Your Art & Craft',
    desc: 'Upload your artwork, gain followers, and track your performance with analytics',
    image: require('../../assets/images/3.jpg'),
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [current, setCurrent] = useState(0);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(nextIndex);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const next = () => {
    if (current < slides.length - 1) animateTransition(current + 1);
    else navigation.replace('Auth');
  };
  const skip = () => navigation.replace('Auth');
  const slide = slides[current];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/*arch image area*/}
      <View style={styles.archWrapper}>
        <Animated.View style={[styles.archContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image source={slide.image} style={styles.archImage} resizeMode="cover" />
          {isDark && <View style={styles.archDarkOverlay} />}
        </Animated.View>
      </View>

      {/*card area*/}
      <View style={[styles.card, { backgroundColor: colors.bg }]}>
        <View style={styles.skipRow}>
          {current < slides.length - 1 ? (
            <TouchableOpacity onPress={skip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.skipText, { color: colors.muted }]}>SKIP</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => animateTransition(i)}>
                <View style={[
                  styles.dot,
                  { backgroundColor: colors.border },
                  i === current && { backgroundColor: colors.saffron, width: 24 },
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.title, { color: colors.darkText }]}>{slide.title}</Text>
          <Text style={[styles.desc,  { color: colors.muted }]}>{slide.desc}</Text>
        </Animated.View>

        {current === slides.length - 1 && (
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.saffron }]} onPress={next} activeOpacity={0.85}>
            <Text style={styles.btnText}>GET STARTED</Text>
          </TouchableOpacity>
        )}
        {current < slides.length - 1 && (
          <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: colors.saffron }]} onPress={next} activeOpacity={0.85}>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  archWrapper: {
    width, height: ARCH_HEIGHT, overflow: 'hidden',
    borderBottomLeftRadius: ARCH_RADIUS,
    borderBottomRightRadius: ARCH_RADIUS,
  },
  archContainer:    { width: '100%', height: '100%' },
  archImage:        { width: '100%', height: '100%' },
  archDarkOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },

  card: { flex: 1, marginTop: -2, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40 },

  skipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  skipText: { fontSize: 12, letterSpacing: 1.5, fontWeight: '600' },

  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:  { width: 8, height: 8, borderRadius: 4 },

  title: { fontSize: 30, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5 },
  desc:  { fontSize: 15, lineHeight: 24 },

  button: {
    position: 'absolute', bottom: 40, left: 32, right: 32,
    paddingVertical: 18, borderRadius: 16, alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 1.2 },

  arrowBtn: {
    position: 'absolute', bottom: 40, right: 32,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  arrowText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
});