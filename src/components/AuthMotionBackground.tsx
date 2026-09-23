import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function AuthMotionBackground() {
  const { width, height } = useWindowDimensions();
  const primarySize = Math.min(340, Math.max(220, width * 0.72));
  const secondarySize = Math.min(104, Math.max(72, width * 0.23));
  const ringSize = Math.min(132, Math.max(92, width * 0.28));
  const drift = useSharedValue(0);
  const reduceMotion = useReducedMotion();

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
      <Animated.View style={[styles.primaryOrb, { width: primarySize, height: primarySize, borderRadius: primarySize / 2, top: -primarySize * 0.42, right: -primarySize * 0.2 }, primaryMotion]} />
      <Animated.View style={[styles.secondaryOrb, { width: secondarySize, height: secondarySize, borderRadius: secondarySize / 2, top: Math.min(height * 0.24, 190), left: -secondarySize * 0.48 }, secondaryMotion]} />
      <Animated.View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, top: primarySize * 0.08, right: -ringSize * 0.46 }, primaryMotion]} />
    </View>
  );
}

const styles = StyleSheet.create({
  primaryOrb: {
    position: 'absolute',
    backgroundColor: '#E8FAF0',
  },
  secondaryOrb: {
    position: 'absolute',
    backgroundColor: '#F2FBF6',
  },
  ring: {
    position: 'absolute',
    borderWidth: 18,
    borderColor: 'rgba(39,199,107,0.07)',
  },
});
