import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BaseScreen, Card, ProgressBar } from '../../src/components';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import type { Meal } from '../../src/types';

type Period = 'week' | 'month' | 'threeMonths';
type Totals = { calories: number; protein: number; carbs: number; fat: number };
type DailyTotals = Totals & { key: string; date: Date; meals: number };
type ChartPoint = Totals & { label: string; daysTracked: number; goalReached: boolean };

const DAY_MS = 86_400_000;
const zeroTotals = (): Totals => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const round = (value: number) => Math.round(value);
const format = (value: number) => round(value).toLocaleString('pt-BR');

function isGoalReached(calories: number, target: number) {
  return target > 0 && calories >= target * 0.9 && calories <= target * 1.1;
}

function aggregate(days: DailyTotals[]): Totals {
  if (!days.length) return zeroTotals();
  const sum = days.reduce((total, day) => ({
    calories: total.calories + day.calories,
    protein: total.protein + day.protein,
    carbs: total.carbs + day.carbs,
    fat: total.fat + day.fat,
  }), zeroTotals());
  return {
    calories: sum.calories / days.length,
    protein: sum.protein / days.length,
    carbs: sum.carbs / days.length,
    fat: sum.fat / days.length,
  };
}

function buildDailyTotals(meals: Meal[]) {
  const days = new Map<string, DailyTotals>();
  meals.forEach(meal => {
    if (!meal.consumedAt) return;
    const consumedAt = new Date(meal.consumedAt);
    if (Number.isNaN(consumedAt.getTime())) return;
    const date = startOfDay(consumedAt);
    const key = dateKey(date);
    const current = days.get(key) || { ...zeroTotals(), key, date, meals: 0 };
    const portions = Number.isFinite(meal.portions) ? meal.portions : 1;
    current.calories += meal.calories * portions;
    current.protein += meal.protein * portions;
    current.carbs += meal.carbs * portions;
    current.fat += meal.fat * portions;
    current.meals += 1;
    days.set(key, current);
  });
  return days;
}

function currentStreak(days: Map<string, DailyTotals>, today: Date) {
  let cursor = startOfDay(today);
  if (!days.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function periodData(period: Period, dailyMap: Map<string, DailyTotals>, calorieGoal: number) {
  const today = startOfDay(new Date());
  const start = period === 'week'
    ? addDays(today, -6)
    : period === 'month'
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const days = [...dailyMap.values()]
    .filter(day => day.date >= start && day.date <= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let points: ChartPoint[];
  if (period === 'week') {
    points = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const day = dailyMap.get(dateKey(date));
      return {
        ...(day || zeroTotals()),
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3),
        daysTracked: day ? 1 : 0,
        goalReached: Boolean(day && isGoalReached(day.calories, calorieGoal)),
      };
    });
  } else if (period === 'month') {
    points = Array.from({ length: 5 }, (_, index) => {
      const bucketDays = days.filter(day => Math.floor((day.date.getDate() - 1) / 7) === index);
      const totals = aggregate(bucketDays);
      const first = (index * 7) + 1;
      const last = Math.min(first + 6, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
      return { ...totals, label: `${first}–${last}`, daysTracked: bucketDays.length, goalReached: bucketDays.some(day => isGoalReached(day.calories, calorieGoal)) };
    });
  } else {
    points = Array.from({ length: 3 }, (_, index) => {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const bucketDays = days.filter(day => day.date.getFullYear() === monthDate.getFullYear() && day.date.getMonth() === monthDate.getMonth());
      const totals = aggregate(bucketDays);
      return {
        ...totals,
        label: monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        daysTracked: bucketDays.length,
        goalReached: bucketDays.some(day => isGoalReached(day.calories, calorieGoal)),
      };
    });
  }

  const averages = aggregate(days);
  const reached = days.filter(day => isGoalReached(day.calories, calorieGoal)).length;
  const spanDays = Math.round((today.getTime() - start.getTime()) / DAY_MS) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(spanDays - 1));
  const previousDays = [...dailyMap.values()].filter(day => day.date >= previousStart && day.date <= previousEnd);
  const previousAverage = aggregate(previousDays).calories;
  const trend = previousAverage > 0 ? Math.round(((averages.calories - previousAverage) / previousAverage) * 100) : null;

  return { start, today, days, points, averages, reached, trend };
}

export default function AnalyticsScreen() {
  const { colors, globalColors } = useTheme();
  const { state } = useAppState();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const dailyMap = useMemo(() => buildDailyTotals(state.meals), [state.meals]);
  const analytics = useMemo(() => periodData(selectedPeriod, dailyMap, state.goals.calories), [dailyMap, selectedPeriod, state.goals.calories]);
  const streak = useMemo(() => currentStreak(dailyMap, new Date()), [dailyMap]);
  const hasData = analytics.days.length > 0;
  const maxChartValue = Math.max(state.goals.calories, ...analytics.points.map(point => point.calories), 1);
  const chartScale = maxChartValue * 1.15;
  const targetLineTop = `${Math.max(0, 100 - ((state.goals.calories / chartScale) * 100))}%` as `${number}%`;
  const periodLabel = selectedPeriod === 'week' ? 'últimos 7 dias' : selectedPeriod === 'month' ? 'mês atual' : 'últimos 3 meses';
  const chartTitle = selectedPeriod === 'week' ? 'Calorias por dia' : selectedPeriod === 'month' ? 'Média diária por semana' : 'Média diária por mês';
  const recentDays = [...analytics.days].reverse().slice(0, 5);
  const progress = (value: number, goal: number) => goal > 0 ? Math.min(value / goal, 1) : 0;

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Analytics</Text>
        <View style={[styles.pillTabs, { backgroundColor: colors.inputBg, borderColor: colors.borderColor }]}>
          {([
            ['week', '7 dias'],
            ['month', 'Mês'],
            ['threeMonths', '3 meses'],
          ] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setSelectedPeriod(value)} style={[styles.pillTab, selectedPeriod === value && [styles.pillTabActive, { backgroundColor: colors.bgCard }]]}>
              <Text style={[styles.pillTabText, { color: selectedPeriod === value ? colors.textMain : colors.textLight }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={[styles.statCardLabel, { color: colors.textLight }]}>Média diária</Text>
              {analytics.trend !== null ? (
                <View style={[styles.trendBadge, { backgroundColor: analytics.trend >= 0 ? '#EDFBF3' : '#FEF2F2' }]}>
                  <Text style={[styles.trendText, { color: analytics.trend >= 0 ? globalColors.primary : globalColors.danger }]}>{analytics.trend >= 0 ? '↑' : '↓'} {Math.abs(analytics.trend)}%</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.statCardValue, { color: colors.textMain }]}>{format(analytics.averages.calories)}</Text>
            <Text style={[styles.statCardSub, { color: colors.textLight }]}>kcal / dia registrado</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={[styles.statCardLabel, { color: colors.textLight }]}>Meta atingida</Text>
              <View style={[styles.trendBadge, { backgroundColor: '#EEF4FF' }]}>
                <Text style={[styles.trendText, { color: globalColors.water }]}>{analytics.days.length ? Math.round((analytics.reached / analytics.days.length) * 100) : 0}%</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: colors.textMain }]}>{analytics.reached}/{analytics.days.length}</Text>
            <View style={styles.squaresRow}>
              {analytics.points.map((point, index) => <View key={`${point.label}-${index}`} style={[styles.squareDot, { backgroundColor: point.goalReached ? globalColors.primary : colors.inputBorder }]} />)}
            </View>
          </Card>

          <Card style={styles.statCard}>
            <Text style={[styles.statCardLabel, { color: colors.textLight, marginBottom: 8 }]}>Proteína méd.</Text>
            <Text style={[styles.statCardValue, { color: globalColors.protein }]}>{format(analytics.averages.protein)}g</Text>
            <Text style={[styles.statCardSub, { color: colors.textLight }]}>meta: {format(state.goals.protein)}g</Text>
            <ProgressBar progress={progress(analytics.averages.protein, state.goals.protein)} color={globalColors.protein} style={{ marginTop: 8 }} />
          </Card>

          <Card style={styles.statCard}>
            <Text style={[styles.statCardLabel, { color: colors.textLight, marginBottom: 8 }]}>Streak atual</Text>
            <Text style={[styles.statCardValue, { color: colors.textMain }]}>{streak} 🔥</Text>
            <Text style={[styles.statCardSub, { color: colors.textLight }]}>dias registrados</Text>
          </Card>
        </View>

        <Card style={[styles.chartCard, { borderColor: colors.borderColor }]}>
          <View style={styles.chartCardHeaderRow}>
            <View>
              <Text style={[styles.chartCardTitle, { color: colors.textMain }]}>{chartTitle}</Text>
              <Text style={[styles.chartSubtitle, { color: colors.textLight }]}>{periodLabel}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.inputBg }]}><Text style={[styles.chipText, { color: colors.textMuted }]}>Meta: {format(state.goals.calories)}</Text></View>
          </View>

          <View style={styles.chartContainer}>
            {state.goals.calories > 0 ? (
              <View style={[styles.chartTargetLine, { borderColor: `${globalColors.primary}55`, top: targetLineTop }]}>
                <Text style={[styles.chartTargetLineText, { color: globalColors.primary, backgroundColor: colors.bgCard }]}>meta</Text>
              </View>
            ) : null}
            <View style={styles.barsRow}>
              {analytics.points.map((point, index) => {
                const heightPercentage = point.calories > 0 ? Math.max(4, Math.min(100, (point.calories / chartScale) * 100)) : 0;
                return (
                  <View key={`${point.label}-${index}`} style={styles.barCol}>
                    <View style={[styles.barTrack, { backgroundColor: colors.inputBorder }]}>
                      <View style={[styles.barFill, { height: `${heightPercentage}%`, backgroundColor: point.goalReached ? globalColors.primary : point.calories > 0 ? globalColors.water : 'transparent' }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textLight }]}>{point.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <Text style={[styles.chartInsightText, { color: colors.textMuted }]}>
            {!hasData ? 'Registre sua primeira refeição para começar o histórico.' : analytics.reached > 0 ? `Meta atingida em ${analytics.reached} dia(s) neste período.` : 'Seus registros aparecerão aqui conforme você se aproxima da meta.'}
          </Text>
        </Card>

        <Card style={[styles.macrosCard, { borderColor: colors.borderColor }]}>
          <Text style={[styles.macrosTitle, { color: colors.textMain }]}>Distribuição de macros</Text>
          <Text style={[styles.macrosSubtitle, { color: colors.textLight }]}>Média dos dias registrados · {periodLabel}</Text>
          <MacroProgress name="Proteína" value={analytics.averages.protein} goal={state.goals.protein} color={globalColors.protein} textColor={colors.textMain} />
          <MacroProgress name="Carboidrato" value={analytics.averages.carbs} goal={state.goals.carbs} color={globalColors.carbs} textColor={colors.textMain} />
          <MacroProgress name="Gordura" value={analytics.averages.fat} goal={state.goals.fat} color={globalColors.fat} textColor={colors.textMain} />
        </Card>

        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: colors.textMain }]}>Histórico do período</Text>
          {!recentDays.length ? (
            <Card style={[styles.emptyCard, { borderColor: colors.borderColor }]}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Tudo começa do zero</Text>
              <Text style={[styles.emptyDescription, { color: colors.textLight }]}>Nenhum dado artificial foi incluído. Suas refeições reais formarão este relatório.</Text>
            </Card>
          ) : recentDays.map(day => {
            const reached = isGoalReached(day.calories, state.goals.calories);
            return (
              <Card key={day.key} style={[styles.historyItem, { borderColor: colors.borderColor }]}>
                <View style={styles.historyRow}>
                  <View style={styles.historyCopy}>
                    <Text style={[styles.historyDay, { color: colors.textMain }]}>{day.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</Text>
                    <Text style={[styles.historyMacros, { color: colors.textLight }]}>P: {round(day.protein)}g · C: {round(day.carbs)}g · G: {round(day.fat)}g · {day.meals} refeição(ões)</Text>
                  </View>
                  <View style={styles.historyCalories}>
                    <Text style={[styles.historyKcal, { color: reached ? globalColors.primary : colors.textMain }]}>{format(day.calories)} kcal</Text>
                    <Text style={[styles.historyStatus, { color: reached ? globalColors.primary : colors.textLight }]}>{reached ? 'Meta atingida ✓' : 'Registrado'}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </BaseScreen>
  );
}

function MacroProgress({ name, value, goal, color, textColor }: { name: string; value: number; goal: number; color: string; textColor: string }) {
  return (
    <View style={styles.macroProgressItem}>
      <View style={styles.macroProgressHeader}>
        <Text style={[styles.macroProgressName, { color: textColor }]}>{name}</Text>
        <Text style={[styles.macroProgressValue, { color }]}>{format(value)}g / {format(goal)}g</Text>
      </View>
      <ProgressBar progress={goal > 0 ? Math.min(value / goal, 1) : 0} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, ...Platform.select({ ios: { paddingTop: 48 } }) },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6 },
  pillTabs: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3 },
  pillTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  pillTabActive: { ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } }) },
  pillTabText: { fontSize: 12, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48.5%', padding: 16 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statCardLabel: { fontSize: 12, fontWeight: '600' },
  trendBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  trendText: { fontSize: 10, fontWeight: '700' },
  statCardValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  statCardSub: { fontSize: 11 },
  squaresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 8 },
  squareDot: { width: 14, height: 14, borderRadius: 4 },
  chartCard: { padding: 18, marginBottom: 14 },
  chartCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  chartCardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  chartSubtitle: { fontSize: 11, marginTop: 2 },
  chip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },
  chartContainer: { height: 165, justifyContent: 'flex-end', position: 'relative', marginBottom: 16 },
  chartTargetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed', alignItems: 'flex-end', zIndex: 1 },
  chartTargetLineText: { fontSize: 10, fontWeight: '700', paddingHorizontal: 4, marginTop: -8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 135, paddingHorizontal: 8 },
  barCol: { alignItems: 'center', flex: 1, maxWidth: 44 },
  barTrack: { height: 112, width: 12, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10, fontWeight: '600', marginTop: 7, textTransform: 'capitalize' },
  chartInsightText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  macrosCard: { padding: 18, marginBottom: 14 },
  macrosTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  macrosSubtitle: { fontSize: 12, marginBottom: 14 },
  macroProgressItem: { marginBottom: 14 },
  macroProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroProgressName: { fontSize: 13, fontWeight: '600' },
  macroProgressValue: { fontSize: 13, fontWeight: '700' },
  historySection: { marginVertical: 12 },
  historySectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4, marginBottom: 12 },
  historyItem: { padding: 16, marginBottom: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  historyCopy: { flex: 1 },
  historyDay: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  historyMacros: { fontSize: 11, marginTop: 4 },
  historyCalories: { alignItems: 'flex-end' },
  historyKcal: { fontSize: 14, fontWeight: '800' },
  historyStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyEmoji: { fontSize: 28, marginBottom: 9 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 5 },
  emptyDescription: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  bottomSpacer: { height: 100 },
});
