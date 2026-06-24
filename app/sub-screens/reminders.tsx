import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { BaseScreen, Card } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';

export default function RemindersScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();

  // Local switch states
  const [waterReminder, setWaterReminder] = useState(true);
  const [breakfastReminder, setBreakfastReminder] = useState(true);
  const [lunchReminder, setLunchReminder] = useState(true);
  const [snackReminder, setSnackReminder] = useState(false);
  const [dinnerReminder, setDinnerReminder] = useState(true);

  const ReminderRow = ({
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
  }) => (
    <View style={[styles.row, { borderBottomColor: colors.borderColor }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#CBD0D8', true: globalColors.primary }}
        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
      />
    </View>
  );

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Lembretes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: globalColors.primary }]}>Lembrete de Água</Text>
          </View>
          <ReminderRow
            title="Lembretes periódicos"
            subtitle="Receber avisos para beber água a cada 2 horas"
            value={waterReminder}
            onValueChange={setWaterReminder}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: globalColors.protein }]}>Lembrete de Refeições</Text>
          </View>
          <ReminderRow
            title="Café da manhã"
            subtitle="Agendado para 08:00"
            value={breakfastReminder}
            onValueChange={setBreakfastReminder}
          />
          <ReminderRow
            title="Almoço"
            subtitle="Agendado para 12:30"
            value={lunchReminder}
            onValueChange={setLunchReminder}
          />
          <ReminderRow
            title="Lanche da tarde"
            subtitle="Agendado para 16:30"
            value={snackReminder}
            onValueChange={setSnackReminder}
          />
          <ReminderRow
            title="Jantar"
            subtitle="Agendado para 20:30"
            value={dinnerReminder}
            onValueChange={setDinnerReminder}
          />
        </Card>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        paddingTop: 44,
      },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
