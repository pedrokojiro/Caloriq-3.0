import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../theme/motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  format?: (value: number) => string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
  format,
  duration = motion.duration.count,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const animatedValue = useSharedValue(value);
  const [displayValue, setDisplayValue] = useState(value);
  const factor = 10 ** decimals;

  useEffect(() => {
    if (reduceMotion) {
      animatedValue.set(value);
      return;
    }
    animatedValue.set(withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    }));
  }, [animatedValue, duration, reduceMotion, value]);

  useAnimatedReaction(
    () => Math.round(animatedValue.value * factor) / factor,
    (current, previous) => {
      if (current !== previous) runOnJS(setDisplayValue)(current);
    },
    [factor],
  );

  const visibleValue = reduceMotion ? value : displayValue;
  const content = format
    ? format(visibleValue)
    : visibleValue.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return <Text style={style}>{prefix}{content}{suffix}</Text>;
}
