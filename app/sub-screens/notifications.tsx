import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Card } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import {
  defaultNotificationPreferences,
  getNotificationPermission,
  isNotificationRuntimeAvailable,
  NotificationPreferences,
  readNotificationPreferences,
  scheduleTestNotification,
  saveNotificationPreferences,
} from '../../src/services/notifications';

type ToggleKey = 'journal' | 'streak' | 'weeklyReport' | 'aiInsights';

type NotificationRowProps = {
  settingKey: ToggleKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  schedule: string;
  value: boolean;
  busy: boolean;
  disabled: boolean;
  primary: string;
  textMain: string;
  textLight: string;
  borderColor: string;
  onValueChange: (key: ToggleKey, value: boolean) => void;
};

function NotificationRow({
  settingKey, icon, title, subtitle, schedule, value, busy, disabled,
  primary, textMain, textLight, borderColor, onValueChange,
}: NotificationRowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <View style={[styles.rowIcon, { backgroundColor: `${primary}14` }]}>
        <Ionicons name={icon} size={20} color={primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textMain }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: textLight }]}>{subtitle}</Text>
        <View style={styles.scheduleRow}>
          <Ionicons name="time-outline" size={12} color={primary} />
          <Text style={[styles.scheduleText, { color: primary }]}>{schedule}</Text>
        </View>
      </View>
      {busy ? <ActivityIndicator color={primary} /> : (
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={next => onValueChange(settingKey, next)}
          trackColor={{ false: '#CBD0D8', true: primary }}
          thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        />
      )}
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ToggleKey | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testing, setTesting] = useState(false);
  const notificationsAvailable = isNotificationRuntimeAvailable();

  useEffect(() => {
    if (!user) return;
    Promise.all([readNotificationPreferences(user.id), getNotificationPermission()])
      .then(([stored, granted]) => {
        setPreferences(stored);
        setPermissionGranted(granted);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const updateToggle = async (key: ToggleKey, value: boolean) => {
    if (!user || saving) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSaving(key);
    try {
      const saved = await saveNotificationPreferences(user.id, next);
      setPreferences(saved);
      setPermissionGranted(await getNotificationPermission());
    } catch (error) {
      setPreferences(preferences);
      if (error instanceof Error && error.message === 'development-build-required') {
        Alert.alert('Teste no APK', 'O Expo Go não oferece notificações no Android. Instale um APK atualizado do CaloriQ para testar os alertas reais.');
      } else if (error instanceof Error && error.message === 'permission-denied') {
        Alert.alert('Permissão necessária', 'Ative as notificações do CaloriQ nas configurações do Android para usar este recurso.');
      } else {
        Alert.alert('Não foi possível salvar', 'Tente novamente em alguns instantes.');
      }
    } finally {
      setSaving(null);
    }
  };

  const rowProps = (settingKey: ToggleKey) => ({
    value: preferences[settingKey],
    busy: saving === settingKey,
    disabled: loading || saving !== null,
    primary: globalColors.primary,
    textMain: colors.textMain,
    textLight: colors.textLight,
    borderColor: colors.borderColor,
    onValueChange: (key: ToggleKey, value: boolean) => void updateToggle(key, value),
  });

  const testNotification = async () => {
    if (testing) return;
    setTesting(true);
    try {
      await scheduleTestNotification();
      setPermissionGranted(true);
      Alert.alert('Teste agendado', 'Feche ou minimize o aplicativo. A notificação chegará em cerca de 5 segundos.');
    } catch (error) {
      if (error instanceof Error && error.message === 'development-build-required') {
        Alert.alert('Teste no APK', 'O Expo Go não oferece notificações no Android. Instale um APK atualizado do CaloriQ para realizar este teste.');
      } else if (error instanceof Error && error.message === 'permission-denied') {
        Alert.alert('Permissão necessária', 'Ative as notificações do CaloriQ nas configurações do Android.');
      } else {
        Alert.alert('Teste indisponível', 'Não foi possível agendar a notificação agora.');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Notificações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.permissionBanner, { backgroundColor: permissionGranted ? `${globalColors.primary}14` : `${globalColors.protein}14`, borderColor: permissionGranted ? `${globalColors.primary}45` : `${globalColors.protein}45` }]}>
          <Ionicons name={permissionGranted ? 'notifications' : 'notifications-off-outline'} size={22} color={permissionGranted ? globalColors.primary : globalColors.protein} />
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: colors.textMain }]}>{!notificationsAvailable ? 'Disponível no APK' : permissionGranted ? 'Notificações permitidas' : 'Ative um alerta para começar'}</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textLight }]}>{!notificationsAvailable ? 'No Expo Go você pode visualizar a tela, mas os alertas reais exigem o APK do CaloriQ.' : permissionGranted ? 'O Android entregará os alertas que você escolher.' : 'O sistema pedirá sua autorização apenas na primeira vez.'}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.testButton, { backgroundColor: globalColors.primary }, testing && styles.testButtonDisabled]}
          onPress={() => void testNotification()}
          disabled={testing}
        >
          {testing ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />}
          <Text style={styles.testButtonText}>{testing ? 'Agendando...' : 'Testar notificação em 5 segundos'}</Text>
        </Pressable>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Alertas e lembretes</Text>
          <NotificationRow settingKey="journal" icon="book-outline" title="Registro de Diário" subtitle="Lembrar de conferir se as refeições do dia foram registradas" schedule="Todos os dias, às 21:00" {...rowProps('journal')} />
          <NotificationRow settingKey="streak" icon="flame-outline" title="Conquistas e Streak" subtitle="Avisar antes do encerramento do acompanhamento diário" schedule="Todos os dias, às 21:30" {...rowProps('streak')} />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Relatórios e insights</Text>
          <NotificationRow settingKey="weeklyReport" icon="bar-chart-outline" title="Relatório Semanal" subtitle="Resumo de calorias, macros, peso e hidratação" schedule="Domingos, às 18:00" {...rowProps('weeklyReport')} />
          <NotificationRow settingKey="aiInsights" icon="sparkles-outline" title="Dicas e Insights da IA" subtitle="Lembrete para conferir recomendações do CaloriQ IA" schedule="Todos os dias, às 10:00" {...rowProps('aiInsights')} />
        </Card>

        <Pressable style={styles.remindersLink} onPress={() => router.push('/sub-screens/reminders')}>
          <View style={[styles.linkIcon, { backgroundColor: `${globalColors.protein}14` }]}>
            <Ionicons name="restaurant-outline" size={22} color={globalColors.protein} />
          </View>
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: colors.textMain }]}>Horários de água e refeições</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textLight }]}>Defina os seus próprios horários de alimentação.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </Pressable>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, ...Platform.select({ ios: { paddingTop: 44 } }) },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, gap: 16, paddingBottom: 36 },
  permissionBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 18, borderWidth: 1 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '800' },
  bannerSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  card: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 11 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1, paddingRight: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  scheduleText: { fontSize: 11, fontWeight: '700' },
  remindersLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 19 },
  linkIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  testButton: { minHeight: 52, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  testButtonDisabled: { opacity: 0.65 },
  testButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
