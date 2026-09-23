import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { AnimatedNumber } from './AnimatedNumber';
import { motion } from '../theme/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  percentage: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  textColor?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 88,
  strokeWidth = 9,
  color = '#FFFFFF',
  trackColor = 'rgba(255, 255, 255, 0.15)',
  textColor = '#FFFFFF',
}) => {
  // Ensure percentage is between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const progress = useSharedValue(clampedPercentage);
  const milestoneScale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = reduceMotion
      ? clampedPercentage
      : withTiming(clampedPercentage, { duration: motion.duration.count, easing: Easing.out(Easing.cubic) });
    if (!reduceMotion && clampedPercentage >= 100) {
      milestoneScale.value = withSequence(
        withSpring(1.06, motion.spring.success),
        withSpring(1, motion.spring.success),
      );
    }
  }, [clampedPercentage, milestoneScale, progress, reduceMotion]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));
  const containerMotion = useAnimatedStyle(() => ({ transform: [{ scale: milestoneScale.value }] }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerMotion]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Animated/filled progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <AnimatedNumber value={clampedPercentage} suffix="%" style={[styles.text, { color: textColor }]} duration={motion.duration.count} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
export default CircularProgress;
