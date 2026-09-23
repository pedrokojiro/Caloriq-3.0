import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle, TextStyle, Pressable, KeyboardTypeOptions, StyleProp, TextInputProps } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { motion } from '../theme/motion';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  importantForAutofill?: TextInputProps['importantForAutofill'];
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  style,
  inputStyle,
  rightIcon,
  onRightIconPress,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  importantForAutofill,
  onFocus,
  onBlur,
}) => {
  const { colors, globalColors } = useTheme();
  const [focused, setFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const focusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusProgress.value, [0, 1], [colors.inputBorder, globalColors.primary]),
    backgroundColor: interpolateColor(focusProgress.value, [0, 1], [colors.inputBg, `${globalColors.primary}0A`]),
    transform: [{ scale: reduceMotion ? 1 : 1 + focusProgress.value * 0.005 }],
  }));

  const updateFocus = (next: boolean) => {
    setFocused(next);
    focusProgress.set(withTiming(next ? 1 : 0, { duration: motion.duration.normal }));
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: focused ? globalColors.primary : colors.textMuted }]}>{label}</Text>
      )}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
          },
          focusStyle,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          importantForAutofill={importantForAutofill}
          underlineColorAndroid="transparent"
          disableFullscreenUI
          onFocus={event => { updateFocus(true); onFocus?.(event); }}
          onBlur={event => { updateFocus(false); onBlur?.(event); }}
          style={[styles.input, { color: colors.textMain }, inputStyle]}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  rightIcon: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default Input;
