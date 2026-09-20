import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import { AuthMotionBackground } from '../../src/components/AuthMotionBackground';

export default function RegisterScreen() {
  const router = useRouter();
  const { globalColors } = useTheme();
  const { register } = useAuth();
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

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerEntrance, { toValue: 1, damping: 14, stiffness: 115, useNativeDriver: true }),
      Animated.timing(formEntrance, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [formEntrance, headerEntrance]);

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
    <BaseScreen scrollable style={styles.screen} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <AuthMotionBackground />
      <Animated.View style={{ opacity: headerEntrance, transform: [{ translateY: headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) }] }}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0D1117" />
        </Pressable>
        <LinearGradient colors={[globalColors.primaryGlow, globalColors.primaryDark]} style={styles.logo}>
          <Text style={styles.logoText}>Q</Text>
        </LinearGradient>
      </View>
      <Text style={styles.eyebrow}>PASSO 1 DE 2</Text>
      <Text style={styles.title}>Crie sua conta</Text>
      <Text style={styles.subtitle}>Primeiro, seus dados de acesso. Depois vamos calcular metas feitas para você.</Text>
      </Animated.View>

      <Animated.View style={[styles.formCard, {
        opacity: formEntrance,
        transform: [{ translateY: formEntrance.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      }]}>
        <Input label="Como podemos chamar você?" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="off" importantForAutofill="no" />
        <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo de 8 caracteres"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          rightIcon={<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#7B8492" />}
          onRightIconPress={() => setShowPassword(value => !value)}
        />
        <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} placeholder="Digite novamente" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Continuar para minhas metas" onPress={submit} loading={loading} disabled={!name.trim() || !email.trim() || password.length < 8 || !confirm} style={styles.button} />
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={globalColors.primary} />
          <Text style={styles.securityText}>Seus dados ficam vinculados somente à sua conta.</Text>
        </View>
      </Animated.View>

      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.footer}>
        <Text style={styles.footerText}>Já tem uma conta? <Text style={{ color: globalColors.primary, fontWeight: '800' }}>Entrar</Text></Text>
      </Pressable>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 32, flexGrow: 1, overflow: 'hidden' },
  contentCompact: { paddingTop: 14, paddingBottom: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F4F6F8', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFF', fontSize: 23, fontWeight: '900' },
  eyebrow: { color: '#1AAF5D', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 31, fontWeight: '900', color: '#0D1117', letterSpacing: -0.9, marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#6B7585', marginBottom: 24, maxWidth: 350 },
  formCard: { borderRadius: 24, borderWidth: 1, borderColor: '#E8EAEE', backgroundColor: '#FFF', padding: 20, shadowColor: '#101828', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  error: { color: '#D92D20', fontSize: 13, lineHeight: 18, marginTop: -4, marginBottom: 14 },
  button: { height: 56 },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, gap: 6 },
  securityText: { color: '#7B8492', fontSize: 11 },
  footer: { alignItems: 'center', padding: 22 },
  footerText: { fontSize: 14, color: '#6B7585' },
});
