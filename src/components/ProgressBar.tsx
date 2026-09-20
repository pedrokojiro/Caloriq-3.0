import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../hooks/useTheme';

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
  const [animatedProgress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    animatedProgress.setValue(0);
    Animated.spring(animatedProgress, {
      toValue: clampedProgress,
      damping: 14,
      stiffness: 90,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, clampedProgress]);

  const animatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
            width: animatedWidth,
            backgroundColor: color,
          },
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
