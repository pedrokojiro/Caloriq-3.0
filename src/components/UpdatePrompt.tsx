import React, { useEffect, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { getApiUrl } from '../services/api';
import { evaluateUpdate, snoozeFor, type AppVersionInfo, type UpdateSnooze } from '../utils/update';

const SNOOZE_KEY = '@caloriq/update-snooze';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const currentVersionCode = Platform.OS === 'android' ? Constants.expoConfig?.android?.versionCode ?? null : null;

async function readSnooze(): Promise<UpdateSnooze | null> {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_KEY);
    return raw ? JSON.parse(raw) as UpdateSnooze : null;
  } catch { return null; }
}

// Consulta a API ao abrir o app (e ao voltar para ele, no máximo a cada 6 horas)
// e oferece baixar o APK novo. Só roda no Android, onde o APK é instalado.
export function UpdatePrompt() {
  const { colors, isDark } = useTheme();
  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [mode, setMode] = useState<'none' | 'optional' | 'required'>('none');

  useEffect(() => {
    if (!currentVersionCode) return;
    let lastCheck = 0;
    let active = true;
    const check = async () => {
      if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
      lastCheck = Date.now();
      try {
        const response = await fetch(`${await getApiUrl()}/api/app/version`);
        if (!response.ok) return;
        const next = await response.json() as AppVersionInfo;
        const result = evaluateUpdate(next, currentVersionCode, await readSnooze());
        if (!active) return;
        setInfo(next);
        setMode(result);
      } catch { /* Sem conexão: tenta de novo na próxima abertura. */ }
    };
    void check();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { active = false; subscription.remove(); };
  }, []);

  if (mode === 'none' || !info?.downloadUrl) return null;
  const required = mode === 'required';
  const brandText = isDark ? '#3DD68C' : '#0E7A3E';

  const later = async () => {
    if (info.latestVersionCode) await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozeFor(info.latestVersionCode))).catch(() => undefined);
    setMode('none');
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={required ? () => undefined : later} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]} accessibilityViewIsModal>
          <View style={[styles.icon, { backgroundColor: isDark ? '#1A3030' : '#E8F7EF' }]}>
            <Ionicons name="cloud-download-outline" size={28} color={brandText} />
          </View>
          <Text style={[styles.title, { color: colors.textMain }]}>{required ? 'Atualização necessária' : 'Nova versão disponível'}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {required
              ? 'Esta versão do CaloriQ não é mais compatível. Baixe a versão nova para continuar usando.'
              : `A versão ${info.latestVersion} do CaloriQ já está disponível.`}
          </Text>
          {info.notes ? <Text style={[styles.notes, { color: colors.textMain, backgroundColor: colors.inputBg }]}>{info.notes}</Text> : null}
          <Text style={[styles.hint, { color: colors.textMuted }]}>O download abre no navegador. Depois, toque no arquivo para instalar por cima: seus dados continuam na conta.</Text>
          <Button title="Atualizar agora" onPress={() => { void Linking.openURL(info.downloadUrl as string); }} style={{ marginTop: 16 }} />
          {required ? null : (
            <Pressable onPress={later} style={styles.later} accessibilityRole="button">
              <Text style={[styles.laterText, { color: brandText }]}>Lembrar depois</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', padding: 16 },
  sheet: { borderRadius: 24, borderWidth: 1, padding: 20 },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 24, marginTop: 6 },
  notes: { fontSize: 14, lineHeight: 20, marginTop: 12, padding: 12, borderRadius: 12, overflow: 'hidden' },
  hint: { fontSize: 12, lineHeight: 16, marginTop: 12 },
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  laterText: { fontSize: 14, fontWeight: '700' },
});
