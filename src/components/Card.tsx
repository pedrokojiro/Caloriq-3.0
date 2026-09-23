import React from 'react';
import { StyleSheet, Pressable, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { motion } from '../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = false,
  onPress,
}) => {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value ? 0.96 : 1, { duration: motion.duration.fast }),
    transform: [{
      scale: reduceMotion
        ? 1
        : withSpring(pressed.value ? motion.scale.cardPressed : 1, motion.spring.card),
    }],
  }));

  const cardStyle: ViewStyle = {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderColor,
    borderWidth: elevated ? 0 : 1,
    borderRadius: 20,
  };

  const shadowStyle: ViewStyle = elevated
    ? {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: colors.shadowOpacity,
        shadowRadius: 12,
        elevation: 5,
      }
    : {};

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { pressed.value = 1; }}
        onPressOut={() => { pressed.value = 0; }}
        style={[styles.container, cardStyle, shadowStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.container, cardStyle, shadowStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
export default Card;
