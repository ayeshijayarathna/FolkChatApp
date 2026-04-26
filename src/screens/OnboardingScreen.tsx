import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, Image, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@react-native-vector-icons/ionicons';

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
  const { isDark } = useTheme();

  const [current, setCurrent] = useState(0);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  //gradients
  const fullGradient = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  const btnGradient = ['#FFA060', '#E07830', '#D4651A'];

  const textColor  = isDark ? '#FFF6E5' : '#3D2817';
  const mutedColor = isDark ? '#D4BCA0' : '#8A6E50';
  const dotColor   = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(212,101,26,0.2)';

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

  const isLast = current === slides.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/*full screen gradient background */}
      <LinearGradient
        colors={fullGradient}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Arch image area */}
      <View style={styles.archWrapper}>
        <Animated.View style={[styles.archContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image source={slide.image} style={styles.archImage} resizeMode="cover" />
          {isDark && <View style={styles.archDarkOverlay} />}
        </Animated.View>
      </View>

      {/* Card area */}
      <View style={styles.card}>

        <View style={styles.skipRow}>
          {current < slides.length - 1 ? (
            <TouchableOpacity onPress={skip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.skipText, { color: mutedColor }]}>SKIP</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => animateTransition(i)}>
                <View style={[
                  styles.dot,
                  { backgroundColor: dotColor },
                  i === current && { backgroundColor: '#D4651A', width: 24 },
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.title, { color: textColor }]}>{slide.title}</Text>
          <Text style={[styles.desc, { color: mutedColor }]}>{slide.desc}</Text>
        </Animated.View>

        {/* Button */}
        <TouchableOpacity
          onPress={next}
          activeOpacity={0.85}
          style={styles.primaryBtnShadow}>
          <LinearGradient
            colors={btnGradient}
            style={styles.primaryBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <Text style={styles.primaryBtnText}>
              {isLast ? 'GET STARTED' : 'NEXT'}
            </Text>
            <Ionicons
              name={isLast ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>

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
  archContainer:   { width: '100%', height: '100%' },
  archImage:       { width: '100%', height: '100%' },
  archDarkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },

  card: {
    flex: 1,
    marginTop: -2,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },

  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  skipText: { fontSize: 12, letterSpacing: 1.5, fontWeight: '600' },

  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:  { width: 8, height: 8, borderRadius: 4 },

  title: { fontSize: 30, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5 },
  desc:  { fontSize: 15, lineHeight: 24 },

  primaryBtnShadow: {
    position: 'absolute',
    bottom: 40, left: 32, right: 32,
    shadowColor: '#D4651A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderRadius: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});