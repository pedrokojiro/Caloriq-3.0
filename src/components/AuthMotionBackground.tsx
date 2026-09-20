import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

export function AuthMotionBackground() {
  const { width } = useWindowDimensions();
  const [motion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [motion]);

  const drift = motion.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] });
  const reverseDrift = motion.interpolate({ inputRange: [0, 1], outputRange: [12, -14] });
  const scale = motion.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.primaryOrb, { width: width * 0.7, height: width * 0.7, borderRadius: width, transform: [{ translateY: drift }, { scale }] }]} />
      <Animated.View style={[styles.secondaryOrb, { transform: [{ translateY: reverseDrift }] }]} />
      <Animated.View style={[styles.ring, { transform: [{ translateY: drift }, { scale }] }]} />
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
