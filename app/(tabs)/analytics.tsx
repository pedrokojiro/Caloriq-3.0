import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { BaseScreen, Card, ProgressBar, AnimatedNumber } from '../../src/components';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import { useDailyHistory } from '../../src/hooks/useDailyHistory';
import { ReportExportCard } from '../../src/components/ReportExportCard';
import { addDays, currentStreak, dateKey, startOfDay, zeroTotals, type DailyTotals, type Totals } from '../../src/utils/history';
import { motion } from '../../src/theme/motion';
import { type } from '../../src/theme/type';
import { layout } from '../../src/theme/layout';
import { triggerHaptic } from '../../src/utils/haptics';

type Period = 'week' | 'month' | 'threeMonths';
type ChartPoint = Totals & { label: string; daysTracked: number; goalReached: boolean };

const DAY_MS = 86_400_000;
const round = (value: number) => Math.round(value);
const format = (value: number) => round(value).toLocaleString('pt-BR');

function AnimatedBar({ percentage, index, color, muted }: { percentage: number; index: number; color: string; muted?: boolean }) {
  const height = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    height.value = reduceMotion
      ? percentage
      : withDelay(index * motion.stagger.short, withTiming(percentage, { duration: motion.duration.slow }));
  }, [height, index, percentage, reduceMotion]);
  const heightStyle = useAnimatedStyle(() => ({ height: `${height.value}%` }));
  return <View style={styles.barTrack}><Reanimated.View style={[styles.barFill, { backgroundColor: color, opacity: muted ? 0.4 : 1 }, heightStyle]} /></View>;
}

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

// "sáb., 14 de nov." vira "Sáb, 14 de nov": só a primeira letra em maiúscula.
const dayLabel = (date: Date) => {
  const text = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/./g, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Analytics no estilo "Diário limpo": a média do período em destaque, três números
// de apoio, um gráfico de barras neutras (verde só onde a meta foi atingida) e listas.
export default function AnalyticsScreen() {
  const { colors, globalColors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useAppState();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const { dailyMap } = useDailyHistory(state.meals);
  const analytics = useMemo(() => periodData(selectedPeriod, dailyMap, state.goals.calories), [dailyMap, selectedPeriod, state.goals.calories]);
  const streak = useMemo(() => currentStreak(dailyMap, new Date()), [dailyMap]);
  const hasData = analytics.days.length > 0;
  const maxChartValue = Math.max(state.goals.calories, ...analytics.points.map(point => point.calories), 1);
  const chartScale = maxChartValue * 1.1;
  const targetLineBottom = `${Math.min(100, (state.goals.calories / chartScale) * 100)}%` as `${number}%`;
  const periodLabel = selectedPeriod === 'week' ? 'últimos 7 dias' : selectedPeriod === 'month' ? 'mês atual' : 'últimos 3 meses';
  const chartTitle = selectedPeriod === 'week' ? 'Calorias por dia' : selectedPeriod === 'month' ? 'Média diária por semana' : 'Média diária por mês';
  const recentDays = [...analytics.days].reverse().slice(0, 7);

  const trendText = analytics.trend === null
    ? 'sem período anterior para comparar'
    : analytics.trend === 0
      ? 'igual ao período anterior'
      : `${Math.abs(analytics.trend)}% ${analytics.trend > 0 ? 'acima' : 'abaixo'} do período anterior`;

  const stats = [
    { label: 'Meta atingida', value: `${analytics.reached}/${analytics.days.length}`, detail: 'dias no alvo (±10%)' },
    { label: 'Proteína média', value: `${format(analytics.averages.protein)} g`, detail: `meta ${format(state.goals.protein)} g` },
    { label: 'Sequência', value: `${streak}`, detail: streak === 1 ? 'dia seguido' : 'dias seguidos' },
  ];

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[type.title, { color: colors.textMain }]} accessibilityRole="header">Analytics</Text>
        </View>

        <View style={[styles.segmented, { backgroundColor: colors.track }]} accessibilityRole="tablist">
          {([
            ['week', '7 dias'],
            ['month', 'Mês'],
            ['threeMonths', '3 meses'],
          ] as const).map(([value, label]) => {
            const selected = selectedPeriod === value;
            return (
              <Pressable
                key={value}
                onPress={() => { if (!selected) void triggerHaptic('selection'); setSelectedPeriod(value); }}
                style={[styles.segment, selected && { backgroundColor: colors.bgCard }]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[type.caption, selected && type.strong, { color: selected ? colors.textMain : colors.textMuted }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.hero}>
          <Text style={[type.caption, { color: colors.textMuted }]}>Média diária · {periodLabel}</Text>
          <View style={styles.heroValue}>
            <AnimatedNumber value={analytics.averages.calories} style={[type.display, { color: colors.textMain }]} />
            <Text style={[type.body, { color: colors.textMuted }]}>kcal</Text>
          </View>
          <Text style={[type.caption, { color: colors.textMuted }]}>{hasData ? trendText : 'Ainda sem registros neste período'}</Text>
        </View>

        <Card style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={[styles.statCol, index > 0 && { borderLeftColor: colors.hairline, borderLeftWidth: StyleSheet.hairlineWidth * 2 }]}>
              <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{stat.label}</Text>
              <Text style={[type.title, type.number, { color: colors.textMain }]} numberOfLines={1}>{stat.value}</Text>
              <Text style={[type.caption, { color: colors.textLight }]} numberOfLines={2}>{stat.detail}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.rowBetween}>
            <Text style={[type.body, type.strong, { color: colors.textMain }]}>{chartTitle}</Text>
            <Text style={[type.caption, type.number, { color: colors.textMuted }]}>meta {format(state.goals.calories)}</Text>
          </View>
          <View style={styles.chartArea}>
            {state.goals.calories > 0 ? (
              <View pointerEvents="none" style={[styles.targetLine, { bottom: targetLineBottom, borderColor: colors.textLight }]} />
            ) : null}
            {analytics.points.map((point, index) => {
              const heightPercentage = point.calories > 0 ? Math.max(4, Math.min(100, (point.calories / chartScale) * 100)) : 0;
              return (
                <View key={`bar-${index}`} style={styles.barCol}>
                  <AnimatedBar
                    percentage={heightPercentage}
                    index={index}
                    color={point.goalReached ? globalColors.action : colors.textLight}
                    muted={!point.goalReached}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.labelsRow}>
            {analytics.points.map((point, index) => (
              <Text key={`label-${index}`} style={[type.caption, styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>{point.label}</Text>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: globalColors.action }]} />
            <Text style={[type.caption, { color: colors.textMuted }]}>no alvo</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.textLight, opacity: 0.4 }]} />
            <Text style={[type.caption, { color: colors.textMuted }]}>fora do alvo</Text>
            <View style={[styles.legendLine, { borderColor: colors.textLight }]} />
            <Text style={[type.caption, { color: colors.textMuted }]}>meta</Text>
          </View>
        </Card>

        <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]} accessibilityRole="header">Macros · média do período</Text>
        <Card style={styles.list}>
          {([
            ['Proteína', analytics.averages.protein, state.goals.protein, globalColors.protein],
            ['Carboidrato', analytics.averages.carbs, state.goals.carbs, globalColors.carbs],
            ['Gordura', analytics.averages.fat, state.goals.fat, globalColors.fat],
          ] as const).map(([name, value, goal, color], index) => (
            <View key={name} style={[styles.macroRow, index > 0 && { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth * 2 }]}>
              <View style={styles.rowBetween}>
                <Text style={[type.body, { color: colors.textMain }]}>{name}</Text>
                <Text style={[type.body, type.number, { color: colors.textMain }]}>
                  {format(value)}<Text style={[type.caption, { color: colors.textMuted }]}> / {format(goal)} g</Text>
                </Text>
              </View>
              <ProgressBar progress={goal > 0 ? Math.min(value / goal, 1) : 0} color={color} trackColor={colors.track} height={4} />
            </View>
          ))}
        </Card>

        <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]} accessibilityRole="header">Dias registrados</Text>
        {!recentDays.length ? (
          <Card style={styles.emptyCard}>
            <Text style={[type.body, type.strong, { color: colors.textMain }]}>Nada neste período</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>Os dias aparecem aqui conforme você registra refeições.</Text>
          </Card>
        ) : (
          <Card style={styles.list}>
            {recentDays.map((day, index) => {
              const reached = isGoalReached(day.calories, state.goals.calories);
              return (
                <View key={day.key} style={[styles.dayRow, index > 0 && { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth * 2 }]}>
                  <View style={styles.flex}>
                    <Text style={[type.body, { color: colors.textMain }]}>{dayLabel(day.date)}</Text>
                    <Text style={[type.caption, type.number, { color: colors.textMuted }]}>
                      P {round(day.protein)} · C {round(day.carbs)} · G {round(day.fat)} · {day.meals} {day.meals === 1 ? 'refeição' : 'refeições'}
                    </Text>
                  </View>
                  <View style={styles.dayKcal}>
                    <Text style={[type.body, type.strong, type.number, { color: colors.textMain }]}>{format(day.calories)}</Text>
                    {reached ? <Text style={[type.caption, { color: colors.brandText }]}>no alvo</Text> : null}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <ReportExportCard key={selectedPeriod} initialPeriod={selectedPeriod} userName={state.profile.name} />
        <View style={{ height: layout.tabBarHeight + Math.max(insets.bottom, 8) + 24 }} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  titleRow: { minHeight: 48, justifyContent: 'center' },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 4, paddingTop: 8 },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statsRow: { flexDirection: 'row', paddingVertical: 16 },
  statCol: { flex: 1, minWidth: 0, paddingHorizontal: 12, gap: 2 },
  chartCard: { padding: 16, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  chartArea: { height: 140, flexDirection: 'row', alignItems: 'flex-end', position: 'relative' },
  targetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { height: '100%', width: 16, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  labelsRow: { flexDirection: 'row', marginTop: -4 },
  barLabel: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLine: { width: 12, borderTopWidth: 1, borderStyle: 'dashed' },
  sectionLabel: { marginTop: 8, marginBottom: -8 },
  list: { paddingHorizontal: 16 },
  macroRow: { paddingVertical: 12, gap: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  dayKcal: { alignItems: 'flex-end' },
  emptyCard: { padding: 16, gap: 4 },
});
