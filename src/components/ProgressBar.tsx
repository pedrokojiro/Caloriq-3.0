import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { motion } from '../theme/motion';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  trackColor,
  height = 6,
  style,
}) => {
  const { colors } = useTheme();

  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const animatedProgress = useSharedValue(clampedProgress);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    animatedProgress.value = reduceMotion
      ? clampedProgress
      : withTiming(clampedProgress, { duration: motion.duration.slow, easing: Easing.out(Easing.cubic) });
  }, [animatedProgress, clampedProgress, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${animatedProgress.value * 100}%` }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor || colors.inputBorder,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
          },
          fillStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 100,
  },
});
export default ProgressBar;
