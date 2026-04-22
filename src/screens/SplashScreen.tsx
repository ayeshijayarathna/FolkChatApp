import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    setTimeout(() => navigation.replace('Onboarding'), 2500);
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/splash1_bg.png')}
      style={styles.bg}
      resizeMode="cover">
      <View style={styles.overlay}>
        <View style={styles.center}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 24, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { alignItems: 'center', paddingHorizontal: 32 },
 logo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.saffron,
  },
});