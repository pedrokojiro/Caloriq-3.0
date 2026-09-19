import React from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle, TextStyle, Pressable, KeyboardTypeOptions, StyleProp, TextInputProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';

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
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
          },
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
          style={[styles.input, { color: colors.textMain }, inputStyle]}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </Pressable>
        )}
      </View>
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
