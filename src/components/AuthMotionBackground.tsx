import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

export function AuthMotionBackground() {
  const { width, height } = useWindowDimensions();
  const primarySize = Math.min(340, Math.max(220, width * 0.72));
  const secondarySize = Math.min(104, Math.max(72, width * 0.23));
  const ringSize = Math.min(132, Math.max(92, width * 0.28));
  const drift = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const { isDark } = useTheme();
  // Verde da marca translúcido: funciona sobre o fundo claro e o escuro.
  const orb = { backgroundColor: isDark ? 'rgba(26,175,93,0.12)' : 'rgba(26,175,93,0.10)' };
  const orbSoft = { backgroundColor: isDark ? 'rgba(26,175,93,0.08)' : 'rgba(26,175,93,0.06)' };

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0.5;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const primaryMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 + drift.value * 28 }, { scale: 0.94 + drift.value * 0.14 }],
  }));
  const secondaryMotion = useAnimatedStyle(() => ({ transform: [{ translateY: 12 - drift.value * 26 }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.primaryOrb, orb, { width: primarySize, height: primarySize, borderRadius: primarySize / 2, top: -primarySize * 0.42, right: -primarySize * 0.2 }, primaryMotion]} />
      <Animated.View style={[styles.secondaryOrb, orbSoft, { width: secondarySize, height: secondarySize, borderRadius: secondarySize / 2, top: Math.min(height * 0.24, 190), left: -secondarySize * 0.48 }, secondaryMotion]} />
      <Animated.View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, top: primarySize * 0.08, right: -ringSize * 0.46 }, primaryMotion]} />
    </View>
  );
}

const styles = StyleSheet.create({
  primaryOrb: {
    position: 'absolute',
  },
  secondaryOrb: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 18,
    borderColor: 'rgba(39,199,107,0.07)',
  },
});
