import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import Reanimated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { BaseScreen, Button, Card, ProgressBar, AnimatedNumber } from '../../src/components';
import { motion } from '../../src/theme/motion';
import { type } from '../../src/theme/type';
import { triggerHaptic } from '../../src/utils/haptics';
import { formatMealTime } from '../../src/utils/time';
import { layout } from '../../src/theme/layout';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

// Início no estilo "Diário limpo": um número em destaque (calorias), o resto em
// listas com linhas finas. Verde só no progresso, no botão principal e nos links.
export default function DashboardScreen() {
  const router = useRouter();
  const { colors, globalColors, toggleTheme, theme } = useTheme();
  const { state, addWater } = useAppState();
  const { profile, goals, meals, waterIntake } = state;
  const insets = useSafeAreaInsets();
  const fabPressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const todayMeals = useMemo(() => {
    const today = new Date();
    return meals
      .filter(meal => {
        if (!meal.consumedAt) return false;
        const consumedAt = new Date(meal.consumedAt);
        return !Number.isNaN(consumedAt.getTime())
          && consumedAt.getFullYear() === today.getFullYear()
          && consumedAt.getMonth() === today.getMonth()
          && consumedAt.getDate() === today.getDate();
      })
      .sort((a, b) => new Date(a.consumedAt ?? 0).getTime() - new Date(b.consumedAt ?? 0).getTime());
  }, [meals]);

  const weekData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const calories = meals.reduce((total, meal) => {
        const consumedAt = meal.consumedAt ? new Date(meal.consumedAt) : null;
        return consumedAt && consumedAt >= date && consumedAt < nextDate
          ? total + meal.calories * meal.portions
          : total;
      }, 0);
      return {
        key: date.toISOString(),
        label: formatter.format(date).toUpperCase(),
        calories: Math.round(calories),
        isToday: index === 6,
      };
    });
  }, [meals]);

  const totals = todayMeals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories * meal.portions;
      acc.protein += meal.protein * meal.portions;
      acc.carbs += meal.carbs * meal.portions;
      acc.fat += meal.fat * meal.portions;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const rounded = {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };

  const calorieProgress = goals.calories > 0 ? Math.min(1, rounded.calories / goals.calories) : 0;
  const caloriesRemaining = Math.max(0, goals.calories - rounded.calories);
  const caloriesOver = goals.calories > 0 ? rounded.calories - goals.calories : 0;
  const waterProgress = goals.water > 0 ? Math.min(1, waterIntake / goals.water) : 0;
  const daysWithMeals = weekData.filter(day => day.calories > 0);
  const weekAverage = daysWithMeals.length
    ? Math.round(daysWithMeals.reduce((sum, day) => sum + day.calories, 0) / daysWithMeals.length)
    : 0;
  const weekMax = Math.max(goals.calories, ...weekData.map(day => day.calories), 1);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (profile.name || '').trim().split(/\s+/)[0] || profile.name;
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  // Uma sugestão concreta, escrita como frase normal (sem "Insight da IA").
  const suggestion = todayMeals.length === 0
    ? 'Registre a primeira refeição do dia para eu acompanhar seus números.'
    : rounded.protein < goals.protein
      ? `Faltam ${Math.max(0, Math.round(goals.protein - rounded.protein))} g de proteína. Uma porção de frango, ovos ou iogurte grego resolve boa parte.`
      : 'Proteína do dia batida. Agora é só manter o resto dentro da meta.';

  const fabMotion = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : withSpring(fabPressed.value ? 0.94 : 1, motion.spring.button) }],
  }));
  const changeWater = (amount: number) => {
    void triggerHaptic('light');
    addWater(amount);
  };

  const tabBarSpace = layout.tabBarHeight + Math.max(insets.bottom, 8);
  const fabBottom = tabBarSpace + 16;

  const macros = [
    { label: 'Proteína', value: rounded.protein, goal: goals.protein, bar: globalColors.protein },
    { label: 'Carboidrato', value: rounded.carbs, goal: goals.carbs, bar: globalColors.carbs },
    { label: 'Gordura', value: rounded.fat, goal: goals.fat, bar: globalColors.fat },
  ];

  return (
    <BaseScreen edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.topCopy}>
            <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{dateLabel}</Text>
            <Text style={[type.title, { color: colors.textMain }]} numberOfLines={1} accessibilityRole="header">
              {greeting}, {firstName}
            </Text>
          </View>
          <Pressable style={styles.iconButton} hitSlop={4} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
            <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.iconButton} hitSlop={4} onPress={() => router.push('/sub-screens/notifications')} accessibilityRole="button" accessibilityLabel="Notificações">
            <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* O número do dia: o valor é o protagonista, o rótulo fica pequeno. */}
        <View style={styles.hero} accessible accessibilityLabel={`${rounded.calories} de ${goals.calories} quilocalorias hoje`}>
          <View style={styles.heroValueRow}>
            <AnimatedNumber value={rounded.calories} style={[type.display, { color: colors.textMain }]} />
            <Text style={[type.body, styles.heroUnit, { color: colors.textMuted }]}>kcal</Text>
          </View>
          <Text style={[type.caption, { color: colors.textMuted }]}>
            de {goals.calories.toLocaleString('pt-BR')} ·{' '}
            {caloriesOver > 0
              ? <Text style={{ color: colors.dangerText }}>{caloriesOver.toLocaleString('pt-BR')} acima da meta</Text>
              : `faltam ${caloriesRemaining.toLocaleString('pt-BR')}`}
          </Text>
          <ProgressBar
            progress={calorieProgress}
            color={caloriesOver > 0 ? colors.dangerText : globalColors.action}
            trackColor={colors.track}
            height={8}
            style={styles.heroBar}
          />
          {profile.streak > 0 ? (
            <View style={styles.streakRow}>
              <Ionicons name="flame-outline" size={16} color={colors.textMuted} />
              <Text style={[type.caption, { color: colors.textMuted }]}>
                {profile.streak} {profile.streak === 1 ? 'dia seguido' : 'dias seguidos'} registrando
              </Text>
            </View>
          ) : null}
        </View>

        <Card style={styles.macrosCard}>
          {macros.map((macro, index) => (
            <View key={macro.label} style={[styles.macroCol, index > 0 && { borderLeftColor: colors.hairline, borderLeftWidth: StyleSheet.hairlineWidth * 2 }]}>
              <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{macro.label}</Text>
              <AnimatedNumber value={macro.value} suffix=" g" style={[type.title, type.number, { color: colors.textMain }]} />
              <Text style={[type.caption, type.number, { color: colors.textLight }]} numberOfLines={1}>de {Math.round(macro.goal)} g</Text>
              <ProgressBar progress={macro.goal > 0 ? macro.value / macro.goal : 0} color={macro.bar} trackColor={colors.track} height={4} style={styles.macroBar} />
            </View>
          ))}
        </Card>

        <Card style={styles.waterCard}>
          <View style={styles.waterCopy}>
            <Text style={[type.caption, { color: colors.textMuted }]}>Água</Text>
            <Text style={[type.body, type.strong, type.number, { color: colors.textMain }]}>
              {(waterIntake / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <Text style={[type.caption, { color: colors.textMuted }]}> de {(goals.water / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</Text>
            </Text>
            <ProgressBar progress={waterProgress} color={globalColors.water} trackColor={colors.track} height={4} style={styles.waterBar} />
          </View>
          <Pressable
            onPress={() => changeWater(-250)}
            style={({ pressed }) => [styles.roundButton, { borderColor: colors.borderColor }, pressed && { backgroundColor: colors.track }]}
            accessibilityRole="button"
            accessibilityLabel="Remover 250 ml de água"
          >
            <Ionicons name="remove" size={20} color={colors.textMain} />
          </Pressable>
          <Pressable
            onPress={() => changeWater(250)}
            style={({ pressed }) => [styles.roundButton, { borderColor: colors.borderColor }, pressed && { backgroundColor: colors.track }]}
            accessibilityRole="button"
            accessibilityLabel="Adicionar 250 ml de água"
          >
            <Ionicons name="add" size={20} color={colors.textMain} />
          </Pressable>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[type.overline, { color: colors.textMuted }]} accessibilityRole="header">Hoje</Text>
          <Pressable onPress={() => router.push('/(tabs)/analytics')} style={styles.linkButton} accessibilityRole="link">
            <Text style={[type.caption, type.strong, { color: colors.brandText }]}>Histórico</Text>
          </Pressable>
        </View>

        {todayMeals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[type.body, type.strong, { color: colors.textMain }]}>Nada registrado ainda</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>
              Fotografe o prato para a IA estimar as calorias, ou adicione à mão se preferir.
            </Text>
          </Card>
        ) : (
          <Card style={styles.mealList}>
            {todayMeals.map((meal, index) => (
              <Reanimated.View key={meal.id} entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.normal)}>
                <Pressable
                  onPress={() => router.push({ pathname: '/(modals)/meal-edit', params: { mealId: meal.id } })}
                  style={({ pressed }) => [
                    styles.mealRow,
                    index > 0 && { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth * 2 },
                    pressed && { backgroundColor: colors.track },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.name}, ${Math.round(meal.calories * meal.portions)} quilocalorias. Editar`}
                >
                  <Text style={[type.caption, type.number, styles.mealTime, { color: colors.textMuted }]}>
                    {formatMealTime(meal.consumedAt, meal.time)}
                  </Text>
                  <View style={styles.mealInfo}>
                    <Text style={[type.body, { color: colors.textMain }]} numberOfLines={1}>{meal.name}</Text>
                    <Text style={[type.caption, type.number, { color: colors.textLight }]} numberOfLines={1}>
                      {meal.type} · P {Math.round(meal.protein * meal.portions)} · C {Math.round(meal.carbs * meal.portions)} · G {Math.round(meal.fat * meal.portions)}
                    </Text>
                  </View>
                  <Text style={[type.body, type.strong, type.number, { color: colors.textMain }]}>
                    {Math.round(meal.calories * meal.portions)}
                  </Text>
                </Pressable>
              </Reanimated.View>
            ))}
          </Card>
        )}

        <Button title="Escanear refeição" onPress={() => router.push('/(tabs)/scanner')} icon={<Ionicons name="scan-outline" size={20} color="#FFFFFF" />} />
        <Pressable onPress={() => router.push('/(modals)/meal-edit')} style={styles.manualButton} accessibilityRole="button">
          <Text style={[type.caption, type.strong, { color: colors.brandText }]}>Adicionar manualmente</Text>
        </Pressable>

        {profile.motivation ? (
          <Pressable onPress={() => router.push('/(tabs)/goals')} accessibilityRole="button" style={[styles.quote, { borderLeftColor: globalColors.action }]}>
            <Text style={[type.caption, { color: colors.textMuted }]}>Seu motivo</Text>
            <Text style={[type.body, { color: colors.textMain }]} numberOfLines={3}>{profile.motivation}</Text>
          </Pressable>
        ) : null}

        <Card style={styles.suggestionCard} onPress={() => router.push('/(modals)/ai-chat')}>
          <Text style={[type.caption, { color: colors.textMuted }]}>Sugestão para hoje</Text>
          <Text style={[type.body, { color: colors.textMain }]}>{suggestion}</Text>
          <Text style={[type.caption, type.strong, { color: colors.brandText }]}>Perguntar ao assistente</Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[type.overline, { color: colors.textMuted }]} accessibilityRole="header">Últimos 7 dias</Text>
          <Text style={[type.caption, type.number, { color: colors.textMuted }]}>
            média {weekAverage.toLocaleString('pt-BR')} kcal
          </Text>
        </View>
        <Card style={styles.chartCard}>
          <View style={styles.chartBars}>
            {/* Linha da meta, para ler cada barra contra o objetivo. */}
            <View pointerEvents="none" style={[styles.goalLine, { bottom: 22 + (goals.calories / weekMax) * 96, borderColor: colors.textLight }]} />
            {weekData.map(day => (
              <View key={day.key} style={styles.chartCol}>
                <View style={[
                  styles.chartBar,
                  {
                    height: day.calories > 0 ? Math.max(6, (day.calories / weekMax) * 96) : 3,
                    backgroundColor: day.isToday ? globalColors.action : colors.textLight,
                    opacity: day.isToday ? 1 : day.calories > 0 ? 0.35 : 0.2,
                  },
                ]} />
                <Text style={[type.caption, { color: day.isToday ? colors.textMain : colors.textLight }, day.isToday && type.strong]} maxFontSizeMultiplier={1.3}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[type.caption, { color: colors.textLight }]}>
            Linha tracejada: meta de {goals.calories.toLocaleString('pt-BR')} kcal
          </Text>
        </Card>

        {/* Espaço para a barra de abas e o botão do assistente. */}
        <View style={{ height: tabBarSpace + layout.fabSize + 24 }} />
      </ScrollView>

      <AnimatedPressable
        style={[styles.fab, { backgroundColor: colors.textMain, bottom: fabBottom, shadowColor: colors.shadowColor }, fabMotion]}
        onPressIn={() => { fabPressed.value = 1; }}
        onPressOut={() => { fabPressed.value = 0; }}
        onPress={() => { void triggerHaptic('medium'); router.push('/(modals)/ai-chat'); }}
        accessibilityRole="button"
        accessibilityLabel="Conversar com o assistente"
      >
        <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.bgApp} />
      </AnimatedPressable>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topCopy: { flex: 1, minWidth: 0 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingTop: 8, gap: 4 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroUnit: { marginBottom: 2 },
  heroBar: { marginTop: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  macrosCard: { flexDirection: 'row', paddingVertical: 16 },
  macroCol: { flex: 1, minWidth: 0, paddingHorizontal: 12, gap: 2 },
  macroBar: { marginTop: 8 },
  waterCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  waterCopy: { flex: 1, minWidth: 0, gap: 2 },
  waterBar: { marginTop: 8 },
  roundButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: -8 },
  linkButton: { minHeight: 48, justifyContent: 'center', paddingLeft: 12 },
  emptyCard: { padding: 16, gap: 4 },
  mealList: { paddingVertical: 0 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 64, paddingVertical: 12 },
  mealTime: { width: 44 },
  mealInfo: { flex: 1, minWidth: 0 },
  manualButton: { alignSelf: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, marginTop: -8 },
  quote: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, gap: 2 },
  suggestionCard: { padding: 16, gap: 8 },
  chartCard: { padding: 16, gap: 12 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, position: 'relative' },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.6 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBar: { width: 16, borderRadius: 4 },
  fab: { position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6, zIndex: 20 },
});
