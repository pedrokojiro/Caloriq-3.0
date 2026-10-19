import React, { useEffect, useState } from 'react';
import { Animated, Easing, Keyboard, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import { AuthMotionBackground } from '../../src/components/AuthMotionBackground';
import { GoogleSignInButton } from '../../src/components/GoogleSignInButton';
import { useReducedMotion } from 'react-native-reanimated';

// Com o teclado aberto, o cabeçalho encolhe para o botão "Entrar" continuar visível.
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

export default function LoginScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { width, height } = useWindowDimensions();
  const compact = height < 720 || width < 360;
  const keyboard = useKeyboardVisible();
  const [headerEntrance] = useState(() => new Animated.Value(0));
  const [formEntrance] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      headerEntrance.setValue(1);
      formEntrance.setValue(1);
      return;
    }
    Animated.stagger(130, [
      Animated.spring(headerEntrance, { toValue: 1, damping: 14, stiffness: 110, useNativeDriver: true }),
      Animated.timing(formEntrance, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [formEntrance, headerEntrance, reduceMotion]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      router.replace((user.onboardingCompleted ? '/(tabs)' : '/(auth)/profile-setup') as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  const logoSize = keyboard ? 44 : compact ? 56 : 64;

  return (
    <BaseScreen scrollable contentContainerStyle={[styles.content, compact && styles.contentCompact, keyboard && styles.contentKeyboard]}>
      <AuthMotionBackground />
      <View style={[styles.authPanel, width >= 600 && styles.authPanelWide]}>
      <Animated.View style={[styles.header, keyboard && styles.headerKeyboard, {
        opacity: headerEntrance,
        transform: [{ translateY: headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }]}>
        <View style={[styles.logo, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.31, backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
          <Image source={require('../../assets/images/caloriq-logo.png')} style={{ width: logoSize * 0.78, height: logoSize * 0.78 }} contentFit="contain" accessibilityLabel="CaloriQ" />
        </View>
        <View style={keyboard ? styles.headerKeyboardCopy : undefined}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: globalColors.primary }]} />
            <Text style={[styles.brand, { color: colors.brandText }]}>CALORIQ</Text>
          </View>
          <Text style={[styles.title, compact && styles.titleCompact, keyboard && styles.titleKeyboard, { color: colors.textMain }]}>Bem-vindo de volta</Text>
        </View>
        {keyboard ? null : <Text style={[styles.subtitle, { color: colors.textMuted }]}>Entre para continuar acompanhando sua alimentação.</Text>}
      </Animated.View>

      <Animated.View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }, {
        opacity: formEntrance,
        transform: [
          { translateY: formEntrance.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
          { scale: formEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
        ],
      }]}>
        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          importantForAutofill="yes"
        />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Digite sua senha"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          importantForAutofill="yes"
          rightIcon={<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />}
          onRightIconPress={() => setShowPassword(value => !value)}
        />
        <Pressable
          onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: email.trim() ? { email: email.trim() } : {} } as never)}
          style={styles.forgot}
          accessibilityRole="link"
        >
          <Text style={[styles.forgotText, { color: colors.brandText }]}>Esqueci minha senha</Text>
        </Pressable>
        {error ? <Text style={[styles.error, { color: colors.dangerText }]} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button title="Entrar na minha conta" onPress={handleLogin} loading={loading} disabled={!email.trim() || !password} haptic="medium" />
        <GoogleSignInButton
          onSignIn={loginWithGoogle}
          onSuccess={user => router.replace((user.onboardingCompleted ? '/(tabs)' : '/(auth)/profile-setup') as never)}
          onError={setError}
        />
      </Animated.View>

      {keyboard ? null : (
        <Animated.View style={{ opacity: formEntrance }}>
          <Pressable onPress={() => router.push('/(auth)/register')} style={styles.footer} accessibilityRole="link">
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Ainda não tem conta? <Text style={{ color: colors.brandText, fontWeight: '800' }}>Criar agora</Text></Text>
          </Pressable>
        </Animated.View>
      )}
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 24, flexGrow: 1, justifyContent: 'center', overflow: 'hidden' },
  contentCompact: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, justifyContent: 'flex-start' },
  contentKeyboard: { justifyContent: 'flex-start', paddingTop: 12 },
  authPanel: { width: '100%', alignSelf: 'center' },
  authPanelWide: { maxWidth: 440 },
  header: { marginBottom: 20 },
  headerKeyboard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headerKeyboardCopy: { flex: 1 },
  logo: { alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  brand: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  titleCompact: { fontSize: 24, lineHeight: 30 },
  titleKeyboard: { fontSize: 22, lineHeight: 28, marginBottom: 0 },
  subtitle: { fontSize: 16, lineHeight: 24, maxWidth: 340 },
  formCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, marginTop: -8, marginBottom: 6 },
  forgotText: { fontSize: 14, fontWeight: '700' },
  error: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  footer: { alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: 16 },
  footerText: { fontSize: 14, lineHeight: 20 },
});
