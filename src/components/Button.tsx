import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator, ViewStyle, TextStyle, View, StyleProp } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { motion } from '../theme/motion';
import { HapticFeedback, triggerHaptic } from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  haptic?: HapticFeedback | false;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  loading = false,
  icon,
  haptic = false,
}) => {
  const { colors, globalColors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const enabled = !disabled && !loading;

  useEffect(() => {
    if (!enabled) pressed.set(0);
  }, [enabled, pressed]);

  const animatedStyle = useAnimatedStyle(() => ({
    // Desativado muda o fundo (ver getContainerStyles) em vez de apagar o conteúdo,
    // para o texto continuar legível; o carregamento mantém a cor normal.
    opacity: withTiming(pressed.value && enabled ? 0.93 : 1, { duration: motion.duration.fast }),
    transform: [{
      scale: reduceMotion
        ? 1
        : withSpring(pressed.value ? motion.scale.buttonPressed : 1, motion.spring.button),
    }],
  }));

  const onPressIn = () => { pressed.set(1); };
  const onPressOut = () => { pressed.set(0); };
  const handlePress = () => {
    if (haptic) void triggerHaptic(haptic);
    onPress();
  };

  const getContainerStyles = (): ViewStyle => {
    if (disabled) return { backgroundColor: colors.disabledBg, borderWidth: 0 };
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.inputBg,
          borderColor: colors.borderColor,
          borderWidth: 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.brandText,
          borderWidth: 1.5,
        };
      case 'danger':
        return {
          backgroundColor: globalColors.dangerBgLight,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {}; // Primary is handled by LinearGradient
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.disabledText;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'outline':
        return colors.brandText;
      case 'danger':
        return colors.dangerText;
      case 'ghost':
        return colors.brandText;
      default:
        return colors.textMain;
    }
  };

  const renderContent = () => {
    if (loading) {
      return <Animated.View key="loading" entering={FadeIn.duration(motion.duration.fast)} exiting={FadeOut.duration(motion.duration.instant)}><ActivityIndicator color={getTextColor()} size="small" /></Animated.View>;
    }

    return (
      <Animated.View key="content" entering={FadeIn.duration(motion.duration.fast)} exiting={FadeOut.duration(motion.duration.instant)} style={styles.content}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      </Animated.View>
    );
  };

  if (variant === 'primary' && !disabled) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[styles.container, animatedStyle, style]}
      >
        {/* Cor sólida de ação: o gradiente claro anterior deixava o texto branco em 2,2:1. */}
        <View style={[styles.gradient, { backgroundColor: globalColors.action }]}>
          {renderContent()}
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      style={[styles.container, getContainerStyles(), animatedStyle, style]}
    >
      {renderContent()}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
export default Button;
