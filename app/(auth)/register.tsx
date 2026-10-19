import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import { AuthMotionBackground } from '../../src/components/AuthMotionBackground';
import { GoogleSignInButton } from '../../src/components/GoogleSignInButton';
import { useReducedMotion } from 'react-native-reanimated';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const [headerEntrance] = useState(() => new Animated.Value(0));
  const [formEntrance] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      headerEntrance.setValue(1);
      formEntrance.setValue(1);
      return;
    }
    Animated.stagger(120, [
      Animated.spring(headerEntrance, { toValue: 1, damping: 14, stiffness: 115, useNativeDriver: true }),
      Animated.timing(formEntrance, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [formEntrance, headerEntrance, reduceMotion]);

  const submit = async () => {
    if (password !== confirm) return setError('As senhas não são iguais.');
    setError('');
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      router.replace('/(auth)/profile-setup' as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseScreen scrollable contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <AuthMotionBackground />
      <Animated.View style={{ opacity: headerEntrance, transform: [{ translateY: headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) }] }}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={4}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </Pressable>
        <View style={[styles.logo, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
          <Image source={require('../../assets/images/caloriq-logo.png')} style={styles.logoImage} contentFit="contain" />
        </View>
      </View>
      <Text style={[styles.eyebrow, { color: colors.brandText }]}>PASSO 1 DE 2</Text>
      <Text style={[styles.title, { color: colors.textMain }]}>Crie sua conta</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Primeiro, seus dados de acesso. Depois vamos calcular metas feitas para você.</Text>
      </Animated.View>

      <Animated.View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }, {
        opacity: formEntrance,
        transform: [{ translateY: formEntrance.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      }]}>
        <Input label="Como podemos chamar você?" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="name" textContentType="name" autoCapitalize="words" />
        <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo de 8 caracteres"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          rightIcon={<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />}
          onRightIconPress={() => setShowPassword(value => !value)}
        />
        <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} placeholder="Digite novamente" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
        {error ? <Text style={[styles.error, { color: colors.dangerText }]} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button title="Continuar para minhas metas" onPress={submit} loading={loading} disabled={!name.trim() || !email.trim() || password.length < 8 || !confirm} style={styles.button} haptic="medium" />
        <GoogleSignInButton
          onSignIn={loginWithGoogle}
          onSuccess={user => router.replace((user.onboardingCompleted ? '/(tabs)' : '/(auth)/profile-setup') as never)}
          onError={setError}
        />
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={globalColors.primary} />
          <Text style={[styles.securityText, { color: colors.textMuted }]}>Seus dados ficam vinculados somente à sua conta.</Text>
        </View>
      </Animated.View>

      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Já tem uma conta? <Text style={{ color: colors.brandText, fontWeight: '800' }}>Entrar</Text></Text>
      </Pressable>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 32, flexGrow: 1, overflow: 'hidden' },
  contentCompact: { paddingTop: 14, paddingBottom: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 54, height: 54, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 46, height: 46 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 24, maxWidth: 350 },
  formCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  error: { fontSize: 14, lineHeight: 20, marginTop: -4, marginBottom: 14 },
  button: { height: 52 },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, gap: 6 },
  securityText: { fontSize: 12, lineHeight: 16, flexShrink: 1 },
  footer: { alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: 16 },
  footerText: { fontSize: 14, lineHeight: 20 },
});
