import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Card } from '../../src/components';
import { TimePickerModal } from '../../src/components/TimePickerModal';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import {
  defaultNotificationPreferences,
  MealReminderKey,
  NotificationPreferences,
  readNotificationPreferences,
  saveNotificationPreferences,
} from '../../src/services/notifications';

const meals: { key: MealReminderKey; title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'breakfast', title: 'Café da manhã', icon: 'sunny-outline' },
  { key: 'lunch', title: 'Almoço', icon: 'restaurant-outline' },
  { key: 'snack', title: 'Lanche da tarde', icon: 'nutrition-outline' },
  { key: 'dinner', title: 'Jantar', icon: 'moon-outline' },
];

export default function RemindersScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealReminderKey | null>(null);

  useEffect(() => {
    if (!user) return;
    readNotificationPreferences(user.id)
      .then(setPreferences)
      .finally(() => setLoading(false));
  }, [user]);

  const persist = async (next: NotificationPreferences, key: string) => {
    if (!user || saving) return false;
    const previous = preferences;
    setPreferences(next);
    setSaving(key);
    try {
      setPreferences(await saveNotificationPreferences(user.id, next));
      return true;
    } catch (error) {
      setPreferences(previous);
      if (error instanceof Error && error.message === 'development-build-required') {
        Alert.alert('Teste no APK', 'O Expo Go não oferece notificações no Android. Instale um APK atualizado do CaloriQ para testar os lembretes reais.');
      } else if (error instanceof Error && error.message === 'permission-denied') {
        Alert.alert('Permissão necessária', 'Ative as notificações do CaloriQ nas configurações do Android para receber os lembretes.');
      } else {
        Alert.alert('Não foi possível salvar', 'Tente novamente em alguns instantes.');
      }
      return false;
    } finally {
      setSaving(null);
    }
  };

  const toggleWater = (value: boolean) => {
    void persist({ ...preferences, water: value }, 'water');
  };

  const toggleMeal = (key: MealReminderKey, value: boolean) => {
    const current = preferences.mealReminders[key];
    if (value && !current.time) {
      setEditingMeal(key);
      return;
    }
    void persist({
      ...preferences,
      mealReminders: { ...preferences.mealReminders, [key]: { ...current, enabled: value } },
    }, key);
  };

  const saveMealTime = async (time: string) => {
    if (!editingMeal) return;
    const key = editingMeal;
    setEditingMeal(null);
    await persist({
      ...preferences,
      mealReminders: { ...preferences.mealReminders, [key]: { enabled: true, time } },
    }, key);
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Lembretes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, { borderColor: `${globalColors.primary}35`, backgroundColor: `${globalColors.primary}10` }]}>
          <Ionicons name="options-outline" size={23} color={globalColors.primary} />
          <View style={styles.introText}>
            <Text style={[styles.introTitle, { color: colors.textMain }]}>Sua rotina, seus horários</Text>
            <Text style={[styles.introSubtitle, { color: colors.textLight }]}>Nenhum horário é pré-definido. Toque em “Definir horário” para configurar cada refeição.</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${globalColors.primary}16` }]}><Ionicons name="water-outline" size={21} color={globalColors.primary} /></View>
            <View><Text style={[styles.cardTitle, { color: globalColors.primary }]}>Lembrete de água</Text><Text style={[styles.cardDescription, { color: colors.textLight }]}>Notificações periódicas durante o dia</Text></View>
          </View>
          <View style={[styles.row, { borderTopColor: colors.borderColor }]}>
            <View style={styles.textContainer}><Text style={[styles.title, { color: colors.textMain }]}>Hidratação</Text><Text style={[styles.subtitle, { color: colors.textLight }]}>Repetir a cada 2 horas após ativar</Text></View>
            {saving === 'water' ? <ActivityIndicator color={globalColors.primary} /> : <Switch value={preferences.water} disabled={loading || saving !== null} onValueChange={toggleWater} trackColor={{ false: '#CBD0D8', true: globalColors.primary }} thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined} />}
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${globalColors.protein}16` }]}><Ionicons name="restaurant-outline" size={21} color={globalColors.protein} /></View>
            <View><Text style={[styles.cardTitle, { color: globalColors.protein }]}>Lembretes de refeições</Text><Text style={[styles.cardDescription, { color: colors.textLight }]}>Defina o horário de cada refeição</Text></View>
          </View>

          {meals.map(({ key, title, icon }) => {
            const reminder = preferences.mealReminders[key];
            return (
              <View key={key} style={[styles.mealRow, { borderTopColor: colors.borderColor }]}>
                <View style={[styles.mealIcon, { backgroundColor: colors.inputBg }]}><Ionicons name={icon} size={18} color={reminder.enabled ? globalColors.protein : colors.textLight} /></View>
                <Pressable style={styles.textContainer} onPress={() => setEditingMeal(key)}>
                  <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
                  <View style={styles.timeLine}>
                    <Ionicons name="time-outline" size={13} color={reminder.time ? globalColors.protein : colors.textLight} />
                    <Text style={[styles.timeText, { color: reminder.time ? globalColors.protein : colors.textLight }]}>{reminder.time ? `Todos os dias às ${reminder.time}` : 'Definir horário'}</Text>
                    <Ionicons name="create-outline" size={13} color={colors.textLight} />
                  </View>
                </Pressable>
                {saving === key ? <ActivityIndicator color={globalColors.protein} /> : <Switch value={reminder.enabled} disabled={loading || saving !== null} onValueChange={value => toggleMeal(key, value)} trackColor={{ false: '#CBD0D8', true: globalColors.primary }} thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined} />}
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <TimePickerModal
        key={editingMeal ? `${editingMeal}:${preferences.mealReminders[editingMeal].time ?? 'new'}` : 'closed'}
        visible={editingMeal !== null}
        title={meals.find(item => item.key === editingMeal)?.title ?? 'Refeição'}
        initialTime={editingMeal ? preferences.mealReminders[editingMeal].time : null}
        onClose={() => setEditingMeal(null)}
        onConfirm={time => void saveMealTime(time)}
      />
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, ...Platform.select({ ios: { paddingTop: 44 } }) },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, gap: 16, paddingBottom: 36 },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 18, padding: 15 },
  introText: { flex: 1 },
  introTitle: { fontSize: 14, fontWeight: '800' },
  introSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardDescription: { fontSize: 11, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14, borderTopWidth: 1 },
  mealIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1, paddingRight: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  timeLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  timeText: { fontSize: 12, fontWeight: '700' },
});
