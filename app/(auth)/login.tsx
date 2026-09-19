import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { globalColors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <BaseScreen scrollable style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.glow} />
      <View style={styles.header}>
        <LinearGradient colors={[globalColors.primaryGlow, globalColors.primaryDark]} style={styles.logo}>
          <Text style={styles.logoText}>Q</Text>
        </LinearGradient>
        <View style={styles.brandRow}>
          <View style={[styles.brandDot, { backgroundColor: globalColors.primary }]} />
          <Text style={[styles.brand, { color: globalColors.primary }]}>CALORIQ</Text>
        </View>
        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.subtitle}>Entre para continuar acompanhando sua alimentação.</Text>
      </View>

      <View style={styles.formCard}>
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
        <Button title="Entrar na minha conta" onPress={handleLogin} loading={loading} disabled={!email.trim() || !password} style={styles.button} />
      </View>

      <Pressable onPress={() => router.push('/(auth)/register')} style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta? <Text style={{ color: globalColors.primary, fontWeight: '800' }}>Criar agora</Text></Text>
      </Pressable>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingVertical: 30, flexGrow: 1, justifyContent: 'center' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#EAFBF1', top: -125, right: -90 },
  header: { marginBottom: 28 },
  logo: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18, elevation: 5, shadowColor: '#1AAF5D', shadowOpacity: 0.25, shadowRadius: 14 },
  logoText: { color: '#FFF', fontSize: 28, fontWeight: '900' },
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
