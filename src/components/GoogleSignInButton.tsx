import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isGoogleSignInAvailable } from '../services/google-auth';
import type { AuthUser } from '../services/api';

// Botão "Continuar com Google". Some quando o login com Google não está disponível
// (web, Expo Go ou APK gerado sem o Client ID).
export function GoogleSignInButton({ onSignIn, onSuccess, onError }: {
  onSignIn: () => Promise<AuthUser | null>;
  onSuccess: (user: AuthUser) => void;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  if (!isGoogleSignInAvailable) return null;

  const press = async () => {
    setLoading(true);
    try {
      const user = await onSignIn();
      if (user) onSuccess(user);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Não foi possível entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.divider}>
        <View style={styles.line} /><Text style={styles.or}>ou</Text><View style={styles.line} />
      </View>
      <Pressable
        onPress={press}
        disabled={loading}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Continuar com Google"
      >
        {loading ? <ActivityIndicator color="#1F1F1F" /> : (
          <>
            <Ionicons name="logo-google" size={20} color="#1F1F1F" />
            <Text style={styles.label}>Continuar com Google</Text>
          </>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#D5DAE0' },
  or: { color: '#4A5565', fontSize: 14 },
  button: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: '#747775', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  pressed: { backgroundColor: '#F1F4F3' },
  label: { color: '#1F1F1F', fontSize: 16, fontWeight: '600' },
});
