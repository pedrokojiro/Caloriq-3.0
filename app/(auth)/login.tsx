import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import { AuthMotionBackground } from '../../src/components/AuthMotionBackground';
import { useReducedMotion } from 'react-native-reanimated';

export default function LoginScreen() {
  const router = useRouter();
  const { globalColors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { width, height } = useWindowDimensions();
  const compact = height < 720 || width < 360;
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

  return (
    <BaseScreen scrollable style={styles.screen} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <AuthMotionBackground />
      <View style={[styles.authPanel, width >= 600 && styles.authPanelWide]}>
      <Animated.View style={[styles.header, {
        opacity: headerEntrance,
        transform: [{ translateY: headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }]}>
        <View style={styles.logo}>
          <Image source={require('../../assets/images/caloriq-logo.png')} style={styles.logoImage} contentFit="contain" />
        </View>
        <View style={styles.brandRow}>
          <View style={[styles.brandDot, { backgroundColor: globalColors.primary }]} />
          <Text style={[styles.brand, { color: globalColors.primary }]}>CALORIQ</Text>
        </View>
        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.subtitle}>Entre para continuar acompanhando sua alimentação.</Text>
      </Animated.View>

      <Animated.View style={[styles.formCard, {
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
          autoComplete="off"
          importantForAutofill="no"
        />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Digite sua senha"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          rightIcon={<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#7B8492" />}
          onRightIconPress={() => setShowPassword(value => !value)}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Entrar na minha conta" onPress={handleLogin} loading={loading} disabled={!email.trim() || !password} style={styles.button} haptic="medium" />
      </Animated.View>

      <Animated.View style={{ opacity: formEntrance }}>
      <Pressable onPress={() => router.push('/(auth)/register')} style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta? <Text style={{ color: globalColors.primary, fontWeight: '800' }}>Criar agora</Text></Text>
      </Pressable>
      </Animated.View>
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingVertical: 24, flexGrow: 1, justifyContent: 'center', overflow: 'hidden' },
  contentCompact: { paddingTop: 14, paddingBottom: 14, justifyContent: 'flex-start' },
  authPanel: { width: '100%', alignSelf: 'center' },
  authPanelWide: { maxWidth: 440 },
  header: { marginBottom: 22 },
  logo: { width: 74, height: 74, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: 'rgba(232,250,240,0.88)', elevation: 3, shadowColor: '#1AAF5D', shadowOpacity: 0.18, shadowRadius: 12 },
  logoImage: { width: 62, height: 62 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brandDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  brand: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '900', color: '#0D1117', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#6B7585', maxWidth: 330 },
  formCard: { borderRadius: 24, borderWidth: 1, borderColor: '#E8EAEE', backgroundColor: '#FFF', padding: 20, shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  error: { color: '#D92D20', fontSize: 13, lineHeight: 18, marginTop: -4, marginBottom: 14 },
  button: { marginTop: 2, height: 56 },
  footer: { alignItems: 'center', padding: 24 },
  footerText: { fontSize: 14, color: '#6B7585' },
});
