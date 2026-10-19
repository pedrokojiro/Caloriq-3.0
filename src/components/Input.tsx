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
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const focusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusProgress.value, [0, 1], [colors.inputBorder, colors.focus]),
    borderWidth: focusProgress.value > 0.5 ? 2 : 1,
    // Keep the opaque theme background while focused. A transparent target made
    // white text disappear against light auth cards when the system used dark mode.
    backgroundColor: colors.inputBg,
    transform: [{ scale: reduceMotion ? 1 : 1 + focusProgress.value * 0.005 }],
  }));

  const updateFocus = (next: boolean) => {
    setFocused(next);
    focusProgress.set(withTiming(next ? 1 : 0, { duration: motion.duration.normal }));
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: focused ? colors.brandText : colors.textMuted }]}>{label}</Text>
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
          <Pressable onPress={onRightIconPress} style={styles.rightIcon} hitSlop={8} accessibilityRole="button" accessibilityLabel={secureTextEntry ? 'Mostrar senha' : 'Ocultar senha'}>
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  rightIcon: {
    marginLeft: 6,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default Input;
