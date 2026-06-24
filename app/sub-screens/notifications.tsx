import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { BaseScreen, Card } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();

  // Local switch states
  const [journalNotif, setJournalNotif] = useState(true);
  const [streakNotif, setStreakNotif] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [aiInsightNotif, setAiInsightNotif] = useState(false);

  const NotificationRow = ({
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
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Notificações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Alertas e Lembretes</Text>
          <NotificationRow
            title="Registro de Diário"
            subtitle="Ser alertado se esquecer de registrar alguma refeição principal"
            value={journalNotif}
            onValueChange={setJournalNotif}
          />
          <NotificationRow
            title="Conquistas e Streak"
            subtitle="Notificar quando estiver prestes a perder ou aumentar o streak de dias seguidos"
            value={streakNotif}
            onValueChange={setStreakNotif}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Relatórios e Insights</Text>
          <NotificationRow
            title="Relatório Semanal"
            subtitle="Resumo de consumo de calorias, macros e peso aos domingos"
            value={weeklyReport}
            onValueChange={setWeeklyReport}
          />
          <NotificationRow
            title="Dicas e Insights da IA"
            subtitle="Receber insights nutricionais baseados nos alimentos consumidos"
            value={aiInsightNotif}
            onValueChange={setAiInsightNotif}
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
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
