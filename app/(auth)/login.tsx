import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import Svg, { Circle, Path } from 'react-native-svg';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const [email, setEmail] = useState('pedro@email.com');
  const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    // Navigate to the main tab navigator
    router.replace('/(tabs)');
  };

  const handleGoogleLogin = () => {
    // Mock login and navigate
    router.replace('/(tabs)');
  };

  return (
    <BaseScreen 
      scrollable 
      style={{ backgroundColor: '#FFFFFF' }} // White bg to match onboarding and HTML
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
        {/* Logo and Greeting */}
        <View style={styles.header}>
          <LinearGradient
            colors={[globalColors.primaryGlow, globalColors.primary]}
            style={styles.logoMini}
          >
            <Svg width={28} height={28} viewBox="0 0 40 40" fill="none">
              <Path d="M20 11c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 14a5 5 0 110-10 5 5 0 010 10z" fill="#fff"/>
              <Circle cx="20" cy="20" r="3" fill="#fff"/>
            </Svg>
          </LinearGradient>
          <Text style={styles.title}>Entrar na conta</Text>
          <Text style={styles.subtitle}>Continue de onde parou ✨</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <Input
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              secureTextEntry={!showPassword}
              rightIcon={
                <Text style={{ fontSize: 18, color: '#9AA3B0' }}>
                  {showPassword ? '👁️' : '🙈'}
                </Text>
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
          </View>

          <Pressable style={styles.forgotPassword} onPress={() => {}}>
            <Text style={[styles.forgotPasswordText, { color: globalColors.primary }]}>
              Esqueci a senha
            </Text>
          </Pressable>
        </View>

        {/* CTA Button */}
        <Button 
          title="Entrar" 
          onPress={handleLogin} 
          variant="primary"
          style={styles.loginButton}
        />

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou continue com</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Button */}
        <Button
          title="Continuar com Google"
          onPress={handleGoogleLogin}
          variant="secondary"
          style={styles.googleButton}
          icon={
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </Svg>
          }
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Não tem conta?{' '}
            <Text style={{ fontWeight: '700', color: globalColors.primary }} onPress={() => {}}>
              Criar agora →
            </Text>
          </Text>
        </View>
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 44,
    backgroundColor: '#FFFFFF',
    minHeight: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 36,
  },
  logoMini: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#1AAF5D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0D1117',
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9AA3B0',
  },
  form: {
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 16,
    height: 54,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E4E8',
  },
  dividerText: {
    fontSize: 13,
    color: '#9AA3B0',
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  googleButton: {
    marginBottom: 32,
    height: 54,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9AA3B0',
  },
});
