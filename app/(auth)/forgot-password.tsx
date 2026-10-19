import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import { caloriqApi } from '../../src/services/api';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors, globalColors, isDark } = useTheme();
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const brandText = isDark ? '#3DD68C' : '#0E7A3E';

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await caloriqApi.requestPasswordReset(email.trim());
      setNotice(result.message);
      setStep('code');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (password !== confirm) return setError('As senhas não são iguais.');
    setError('');
    setLoading(true);
    try {
      const user = await resetPassword(email.trim(), code, password);
      router.replace((user.onboardingCompleted ? '/(tabs)' : '/(auth)/profile-setup') as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const eyeIcon = <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />;

  return (
    <BaseScreen scrollable contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => (step === 'code' ? setStep('email') : router.back())}
        style={[styles.back, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={4}
      >
        <Ionicons name="arrow-back" size={22} color={colors.textMain} />
      </Pressable>

      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: brandText }]}>{step === 'email' ? 'PASSO 1 DE 2' : 'PASSO 2 DE 2'}</Text>
        <Text style={[styles.title, { color: colors.textMain }]}>{step === 'email' ? 'Recuperar senha' : 'Crie uma nova senha'}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {step === 'email'
            ? 'Informe o e-mail da sua conta. Vamos enviar um código de 6 dígitos.'
            : `Digite o código enviado para ${email.trim()} e escolha a nova senha.`}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
        {step === 'email' ? (
          <>
            <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
            {error ? <Text style={[styles.error, { color: isDark ? '#FF8A7A' : '#C4320A' }]}>{error}</Text> : null}
            <Button title="Enviar código" onPress={requestCode} loading={loading} disabled={!email.trim()} haptic="medium" />
          </>
        ) : (
          <>
            {notice ? (
              <View style={[styles.notice, { backgroundColor: isDark ? '#1A3030' : '#E8F7EF' }]}>
                <Ionicons name="mail-outline" size={18} color={brandText} />
                <Text style={[styles.noticeText, { color: colors.textMain }]}>{notice}</Text>
              </View>
            ) : null}
            <Input label="Código" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" />
            <Input label="Nova senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 8 caracteres" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" rightIcon={eyeIcon} onRightIconPress={() => setShowPassword(value => !value)} />
            <Input label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} placeholder="Digite novamente" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
            {error ? <Text style={[styles.error, { color: isDark ? '#FF8A7A' : '#C4320A' }]}>{error}</Text> : null}
            <Button title="Salvar nova senha e entrar" onPress={submitReset} loading={loading} disabled={code.length !== 6 || password.length < 8 || !confirm} haptic="medium" />
            <Pressable onPress={requestCode} disabled={loading} style={styles.resend} accessibilityRole="button">
              <Text style={[styles.resendText, { color: brandText }]}>Reenviar código</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={16} color={globalColors.primary} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Ao trocar a senha, você sai da conta nos outros aparelhos.</Text>
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, flexGrow: 1 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  header: { marginBottom: 20 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 14, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  error: { fontSize: 14, lineHeight: 20, marginTop: -4, marginBottom: 14 },
  resend: { alignSelf: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingHorizontal: 8 },
  footerText: { fontSize: 12, lineHeight: 16, flexShrink: 1, textAlign: 'center' },
});
