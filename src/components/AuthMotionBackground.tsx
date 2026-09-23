import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function AuthMotionBackground() {
  const { width } = useWindowDimensions();
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
      <Animated.View style={[styles.primaryOrb, { width: width * 0.7, height: width * 0.7, borderRadius: width }, primaryMotion]} />
      <Animated.View style={[styles.secondaryOrb, secondaryMotion]} />
      <Animated.View style={[styles.ring, primaryMotion]} />
    </View>
  );
}

const styles = StyleSheet.create({
  primaryOrb: {
    position: 'absolute',
    top: -155,
    right: -105,
    backgroundColor: '#E8FAF0',
  },
  secondaryOrb: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    top: 118,
    left: -46,
    backgroundColor: '#F2FBF6',
  },
  ring: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 18,
    borderColor: 'rgba(39,199,107,0.07)',
    bottom: 36,
    right: -64,
  },
});
