import React, { useEffect, useMemo, useState } from 'react';
import { Animated as RNAnimated, Easing, StyleSheet, Text, View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import Reanimated, { FadeInUp, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { BaseScreen, Card, ProgressBar, CircularProgress, AnimatedNumber } from '../../src/components';
import { motion } from '../../src/theme/motion';
import { triggerHaptic } from '../../src/utils/haptics';
import { formatMealTime } from '../../src/utils/time';
import { layout } from '../../src/theme/layout';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, globalColors, toggleTheme, theme } = useTheme();
  const { state, addWater } = useAppState();
  const { profile, goals, meals, waterIntake } = state;
  const { width } = useWindowDimensions();
  // Abaixo de 360dp o cabeçalho fica compacto e o atalho de Perfil sai (já existe na aba).
  const compact = width < 360;
  const insets = useSafeAreaInsets();
  const [headerEntrance] = useState(() => new RNAnimated.Value(0));
  const [bodyEntrance] = useState(() => new RNAnimated.Value(0));
  const [backgroundMotion] = useState(() => new RNAnimated.Value(0));
  const waterBounce = useSharedValue(1);
  const fabPressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const todayMeals = useMemo(() => {
    const today = new Date();
    return meals.filter(meal => {
      if (!meal.consumedAt) return false;
      const consumedAt = new Date(meal.consumedAt);
      return !Number.isNaN(consumedAt.getTime())
        && consumedAt.getFullYear() === today.getFullYear()
        && consumedAt.getMonth() === today.getMonth()
        && consumedAt.getDate() === today.getDate();
    });
  }, [meals]);

  const weekData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
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
        label: index === 6 ? 'Hoje' : formatter.format(date).replace('.', ''),
        calories: Math.round(calories),
        isToday: index === 6,
      };
    });
  }, [meals]);

  useEffect(() => {
    const entrance = RNAnimated.stagger(130, [
      RNAnimated.spring(headerEntrance, { toValue: 1, damping: 14, stiffness: 115, mass: 0.8, useNativeDriver: true }),
      RNAnimated.spring(bodyEntrance, { toValue: 1, damping: 15, stiffness: 105, mass: 0.8, useNativeDriver: true }),
    ]);
    const floatingBackground = RNAnimated.loop(RNAnimated.sequence([
      RNAnimated.timing(backgroundMotion, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      RNAnimated.timing(backgroundMotion, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    entrance.start();
    floatingBackground.start();
    return () => floatingBackground.stop();
  }, [backgroundMotion, bodyEntrance, headerEntrance]);

  // Calculate totals from meals
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

  const roundedTotals = {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };

  const caloriePercentage = goals.calories > 0
    ? Math.min(100, Math.round((roundedTotals.calories / goals.calories) * 100))
    : 0;
  const caloriesRemaining = Math.max(0, goals.calories - roundedTotals.calories);

  const proteinProgress = goals.protein > 0 ? Math.min(1, roundedTotals.protein / goals.protein) : 0;
  const carbsProgress = goals.carbs > 0 ? Math.min(1, roundedTotals.carbs / goals.carbs) : 0;
  const fatProgress = goals.fat > 0 ? Math.min(1, roundedTotals.fat / goals.fat) : 0;

  const waterProgress = goals.water > 0 ? Math.min(1, waterIntake / goals.water) : 0;
  const weekAverage = Math.round(weekData.reduce((sum, day) => sum + day.calories, 0) / weekData.length);
  const greeting = new Date().getHours() < 12 ? 'Bom dia,' : new Date().getHours() < 18 ? 'Boa tarde,' : 'Boa noite,';
  const headerTranslate = headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] });
  const bodyTranslate = bodyEntrance.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const orbTranslate = backgroundMotion.interpolate({ inputRange: [0, 1], outputRange: [-12, 14] });
  const orbScale = backgroundMotion.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] });
  const proteinInsight = todayMeals.length === 0
    ? 'Comece registrando sua primeira refeição para receber uma análise personalizada do seu dia.'
    : roundedTotals.protein < goals.protein
      ? `Faltam ${Math.max(0, Math.round(goals.protein - roundedTotals.protein))}g de proteína para sua meta de hoje.`
      : 'Meta de proteína atingida hoje. Excelente trabalho! 🎉';

  const waterIconMotion = useAnimatedStyle(() => ({ transform: [{ scale: waterBounce.value }] }));
  const fabMotion = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : withSpring(fabPressed.value ? 0.92 : 1, motion.spring.button) }],
  }));
  const changeWater = (amount: number) => {
    void triggerHaptic('light');
    if (!reduceMotion) {
      waterBounce.set(withSequence(
        withSpring(1.15, motion.spring.success),
        withSpring(1, motion.spring.success),
      ));
    }
    addWater(amount);
  };

  const firstName = (profile.name || '').trim().split(/\s+/)[0] || profile.name;
  const caloriesOver = goals.calories > 0 ? roundedTotals.calories - goals.calories : 0;
  const tabBarSpace = layout.tabBarHeight + Math.max(insets.bottom, 8);
  const fabBottom = tabBarSpace + 16;

  return (
    <BaseScreen edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho: texto sempre branco 100% sobre o gradiente escuro (>= 4,98:1). */}
        <LinearGradient
          colors={globalColors.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.greenHeader, { paddingTop: insets.top + (compact ? 8 : 12) }, compact && styles.greenHeaderCompact]}
        >
          <RNAnimated.View pointerEvents="none" style={[styles.headerOrbLarge, { transform: [{ translateY: orbTranslate }, { scale: orbScale }] }]} />

          <RNAnimated.View style={[styles.userRow, { opacity: headerEntrance, transform: [{ translateY: headerTranslate }] }]}>
            <View style={styles.userCopy}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text numberOfLines={1} style={[styles.username, compact && styles.usernameCompact]} accessibilityRole="header">{firstName} 👋</Text>
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={14} color="#FFC27A" />
                <Text style={styles.streakText} maxFontSizeMultiplier={1.3}>{profile.streak} {profile.streak === 1 ? 'dia seguido' : 'dias seguidos'}</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.headerIcon} hitSlop={4} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
                <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.headerIcon} hitSlop={4} onPress={() => router.push('/sub-screens/notifications')} accessibilityRole="button" accessibilityLabel="Notificações">
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              </Pressable>
              {compact ? null : (
                <Pressable style={styles.headerIcon} hitSlop={4} onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button" accessibilityLabel="Perfil">
                  <Ionicons name="person-outline" size={20} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </RNAnimated.View>

          <RNAnimated.View style={[styles.calorieCard, compact && styles.calorieCardCompact, { opacity: headerEntrance, transform: [{ scale: headerEntrance }] }]}>
            <CircularProgress
              percentage={caloriePercentage}
              size={compact ? 64 : 76}
              strokeWidth={compact ? 7 : 8}
              color="#FFFFFF"
              trackColor="rgba(255, 255, 255, 0.28)"
              textColor="#FFFFFF"
            />
            <View style={styles.calorieCardInfo}>
              <Text style={styles.calorieLabel}>Calorias hoje</Text>
              <View style={styles.calorieValueContainer}>
                <AnimatedNumber value={roundedTotals.calories} style={[styles.calorieValue, compact && styles.calorieValueCompact]} />
                <Text style={styles.calorieTarget}>/ {goals.calories.toLocaleString('pt-BR')} kcal</Text>
              </View>
              <ProgressBar progress={caloriePercentage / 100} color="#FFFFFF" trackColor="rgba(255, 255, 255, 0.28)" height={6} />
              <Text style={styles.calorieRemainingText}>
                {caloriesOver > 0
                  ? <>Meta ultrapassada em <Text style={styles.bold}>{caloriesOver.toLocaleString('pt-BR')} kcal</Text></>
                  : <>Faltam <Text style={styles.bold}>{caloriesRemaining.toLocaleString('pt-BR')} kcal</Text> para a meta</>}
              </Text>
            </View>
          </RNAnimated.View>
        </LinearGradient>

        <RNAnimated.View style={[styles.bodyContent, { opacity: bodyEntrance, transform: [{ translateY: bodyTranslate }] }]}>
          <View style={styles.macrosRow}>
            {([
              ['Proteína', roundedTotals.protein, goals.protein, proteinProgress, colors.proteinText, globalColors.protein],
              ['Carboidrato', roundedTotals.carbs, goals.carbs, carbsProgress, colors.carbsText, globalColors.carbs],
              ['Gordura', roundedTotals.fat, goals.fat, fatProgress, colors.fatText, globalColors.fat],
            ] as const).map(([label, value, goal, progress, textColor, barColor]) => (
              <Card key={label} style={styles.macroPill}>
                <AnimatedNumber value={value} suffix=" g" style={[styles.macroValue, { color: textColor }]} />
                <Text style={[styles.macroLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.macroGoal, { color: colors.textLight }]} numberOfLines={1}>de {Math.round(goal)} g</Text>
                <ProgressBar progress={progress} color={barColor} trackColor={colors.track} style={styles.macroProgress} />
              </Card>
            ))}
          </View>

          {/* Água em duas linhas: o valor nunca encosta no título, e os botões têm 48dp. */}
          <Card style={[styles.waterCard, { borderColor: colors.borderColor }]}>
            <View style={styles.waterTop}>
              <Reanimated.View style={[styles.waterIconContainer, { backgroundColor: colors.waterTint }, waterIconMotion]}>
                <Ionicons name="water" size={20} color={colors.waterText} />
              </Reanimated.View>
              <View style={styles.waterInfo}>
                <Text style={[styles.waterTitle, { color: colors.textMain }]}>Hidratação</Text>
                <View style={styles.waterAnimatedValue}>
                  <AnimatedNumber value={waterIntake / 1000} decimals={1} style={[styles.waterValueText, { color: colors.waterText }]} />
                  <Text style={[styles.waterValueText, { color: colors.waterText }]}> de {(goals.water / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</Text>
                </View>
              </View>
              <View style={styles.waterControls}>
                <Pressable onPress={() => changeWater(-250)} style={[styles.waterBtn, { backgroundColor: colors.waterTint }]} accessibilityRole="button" accessibilityLabel="Remover 250 ml de água">
                  <Ionicons name="remove" size={22} color={colors.waterText} />
                </Pressable>
                <Pressable onPress={() => changeWater(250)} style={[styles.waterBtn, { backgroundColor: colors.waterTint }]} accessibilityRole="button" accessibilityLabel="Adicionar 250 ml de água">
                  <Ionicons name="add" size={22} color={colors.waterText} />
                </Pressable>
              </View>
            </View>
            <ProgressBar progress={waterProgress} color={colors.waterText} trackColor={colors.track} height={6} />
          </Card>

          {profile.motivation ? (
            <Pressable onPress={() => router.push('/(tabs)/goals')} accessibilityRole="button">
              <Card style={[styles.motivationCard, { borderColor: colors.aiBorder }]}>
                <View style={[styles.motivationIcon, { backgroundColor: colors.aiTint }]}>
                  <Ionicons name="heart" size={19} color={colors.brandText} />
                </View>
                <View style={styles.motivationCopy}>
                  <Text style={[styles.motivationEyebrow, { color: colors.brandText }]}>LEMBRE-SE DO SEU PORQUÊ</Text>
                  <Text style={[styles.motivationText, { color: colors.textMain }]} numberOfLines={3}>{profile.motivation}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </Card>
            </Pressable>
          ) : null}

          <View style={styles.mealsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMain }]} accessibilityRole="header">Refeições de hoje</Text>
              <Pressable onPress={() => router.push('/(tabs)/analytics')} style={styles.linkButton} accessibilityRole="link">
                <Text style={[styles.linkText, { color: colors.brandText }]}>Ver histórico</Text>
              </Pressable>
            </View>

            {todayMeals.length === 0 ? (
              <Card style={styles.emptyMealsCard}>
                <Text style={[styles.emptyMealsText, { color: colors.textMuted }]}>Nenhuma refeição registrada hoje.</Text>
              </Card>
            ) : (
              todayMeals.map((meal, index) => (
                <Reanimated.View key={meal.id} entering={FadeInUp.delay(index * motion.stagger.short).duration(motion.duration.normal)} layout={LinearTransition.duration(motion.duration.normal)}>
                  <Card
                    style={[styles.mealCard, { borderColor: colors.borderColor }]}
                    onPress={() => router.push({ pathname: '/(modals)/meal-edit', params: { mealId: meal.id } })}
                  >
                    <View style={styles.mealCardRow}>
                      <View style={[styles.mealEmojiContainer, { backgroundColor: colors.inputBg }]}>
                        <Text style={styles.mealEmoji}>{meal.emoji}</Text>
                      </View>
                      <View style={styles.mealInfo}>
                        <Text style={[styles.mealName, { color: colors.textMain }]} numberOfLines={2}>{meal.name}</Text>
                        <Text style={[styles.mealMeta, { color: colors.textMuted }]}>{meal.type} · {formatMealTime(meal.consumedAt, meal.time)}</Text>
                        <Text style={[styles.mealMacros, { color: colors.textLight }]}>
                          P {Math.round(meal.protein * meal.portions)} g · C {Math.round(meal.carbs * meal.portions)} g · G {Math.round(meal.fat * meal.portions)} g
                        </Text>
                      </View>
                      <View style={styles.mealCaloriesContainer}>
                        <Text style={[styles.mealCaloriesValue, { color: colors.textMain }]}>{Math.round(meal.calories * meal.portions)}</Text>
                        <Text style={[styles.mealCaloriesLabel, { color: colors.textLight }]}>kcal</Text>
                      </View>
                    </View>
                  </Card>
                </Reanimated.View>
              ))
            )}

            {/* Mesmo destino da aba central (Scanner); rótulo alinhado ao destino. */}
            <Pressable
              onPress={() => router.push('/(tabs)/scanner')}
              style={({ pressed }) => [styles.registerMealBtn, { borderColor: colors.brandText }, pressed && { backgroundColor: colors.aiTint }]}
              accessibilityRole="button"
            >
              <Ionicons name="scan-outline" size={20} color={colors.brandText} />
              <Text style={[styles.registerMealBtnText, { color: colors.brandText }]}>Escanear refeição</Text>
            </Pressable>
            {/* Proposta B: registro manual pelo formulário de refeição que já existe. */}
            <Pressable onPress={() => router.push('/(modals)/meal-edit')} style={styles.manualButton} accessibilityRole="button">
              <Ionicons name="create-outline" size={18} color={colors.brandText} />
              <Text style={[styles.linkText, { color: colors.brandText }]}>Adicionar manualmente</Text>
            </Pressable>
          </View>

          <Card style={[styles.insightCard, { backgroundColor: colors.aiTint, borderColor: colors.aiBorder }]} onPress={() => router.push('/(modals)/ai-chat')}>
            <View style={[styles.insightIconContainer, { backgroundColor: globalColors.action }]}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.insightContent}>
              <View style={styles.insightHeaderRow}>
                <Text style={[styles.insightTitle, { color: colors.brandText }]}>Insight da IA</Text>
                <View style={[styles.insightBadge, { borderColor: colors.brandText }]}>
                  <Text style={[styles.insightBadgeText, { color: colors.brandText }]} maxFontSizeMultiplier={1.3}>Conversar</Text>
                </View>
              </View>
              <Text style={[styles.insightDesc, { color: colors.textMain }]}>{proteinInsight}</Text>
            </View>
          </Card>

          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMain }]} accessibilityRole="header">Minha semana</Text>
              <Pressable onPress={() => router.push('/(tabs)/analytics')} style={styles.linkButton} accessibilityRole="link">
                <Text style={[styles.linkText, { color: colors.brandText }]}>Ver tudo</Text>
              </Pressable>
            </View>
            <Card style={[styles.chartCard, { borderColor: colors.borderColor }]}>
              <View style={styles.chartBarsContainer}>
                {weekData.map(day => {
                  const ratio = goals.calories > 0 ? day.calories / goals.calories : 0;
                  const height = day.calories > 0 ? Math.min(80, Math.max(10, ratio * 80)) : 4;
                  return (
                    <View key={day.key} style={styles.chartBarCol}>
                      <View style={[
                        day.isToday ? styles.chartBarToday : styles.chartBarFill,
                        {
                          height,
                          borderColor: globalColors.primary,
                          backgroundColor: day.isToday ? `${globalColors.primary}20` : globalColors.primary,
                          opacity: day.calories > 0 ? 1 : 0.25,
                        },
                      ]} />
                      <Text style={[styles.chartBarLabel, { color: day.isToday ? colors.brandText : colors.textLight }, day.isToday && styles.chartBarLabelToday]} maxFontSizeMultiplier={1.3}>{day.label}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartSummary}>
                <View style={[styles.chartSummaryDot, { backgroundColor: globalColors.primary }]} />
                <Text style={[styles.chartSummaryText, { color: colors.textLight }]}>
                  Média dos últimos 7 dias: {weekAverage.toLocaleString('pt-BR')} kcal · Meta: {goals.calories.toLocaleString('pt-BR')} kcal
                </Text>
              </View>
            </Card>
          </View>

          {/* Espaço para a barra de abas e o FAB: o último card nunca termina escondido. */}
          <View style={{ height: tabBarSpace + layout.fabSize + 24 }} />
        </RNAnimated.View>
      </ScrollView>

      <AnimatedPressable
        style={[styles.fab, { backgroundColor: globalColors.action, bottom: fabBottom }, fabMotion]}
        onPressIn={() => { fabPressed.value = 1; }}
        onPressOut={() => { fabPressed.value = 0; }}
        onPress={() => { void triggerHaptic('medium'); router.push('/(modals)/ai-chat'); }}
        accessibilityRole="button"
        accessibilityLabel="Conversar com a IA"
      >
        <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
      </AnimatedPressable>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  greenHeader: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', position: 'relative' },
  greenHeaderCompact: { paddingBottom: 14 },
  headerOrbLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(26,175,93,0.35)', top: -110, right: -90 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  userCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  greeting: { fontSize: 14, lineHeight: 20, color: '#FFFFFF', fontWeight: '500' },
  username: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  usernameCompact: { fontSize: 20, lineHeight: 26 },
  streakChip: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  streakText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  calorieCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.12)' },
  calorieCardCompact: { gap: 12, padding: 12 },
  calorieCardInfo: { flex: 1, minWidth: 0, gap: 4 },
  calorieLabel: { fontSize: 14, lineHeight: 20, color: '#FFFFFF', fontWeight: '600' },
  calorieValueContainer: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 },
  calorieValue: { fontSize: 32, lineHeight: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  calorieValueCompact: { fontSize: 28, lineHeight: 32 },
  calorieTarget: { fontSize: 14, lineHeight: 20, color: '#FFFFFF', fontWeight: '500' },
  calorieRemainingText: { fontSize: 14, lineHeight: 20, color: '#FFFFFF', marginTop: 2 },
  bold: { fontWeight: '800' },
  bodyContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  macrosRow: { flexDirection: 'row', gap: 8 },
  macroPill: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  macroLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  macroGoal: { fontSize: 12, lineHeight: 16 },
  macroProgress: { width: '100%', marginTop: 6 },
  waterCard: { padding: 14, gap: 10, borderWidth: 1 },
  waterTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  waterInfo: { flex: 1, minWidth: 0 },
  waterTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  waterAnimatedValue: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  waterValueText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  waterControls: { flexDirection: 'row', gap: 4 },
  waterBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  motivationCard: { padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  motivationIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  motivationCopy: { flex: 1, minWidth: 0 },
  motivationEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.6, marginBottom: 2 },
  motivationText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  mealsSection: { gap: 10, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2, flexShrink: 1 },
  linkButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  emptyMealsCard: { padding: 20, alignItems: 'center' },
  emptyMealsText: { fontSize: 14, lineHeight: 20 },
  mealCard: { padding: 12, paddingHorizontal: 14, borderWidth: 1 },
  mealCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealEmojiContainer: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealEmoji: { fontSize: 24 },
  mealInfo: { flex: 1, minWidth: 0 },
  mealName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  mealMeta: { fontSize: 14, lineHeight: 20 },
  mealMacros: { fontSize: 12, lineHeight: 16, marginTop: 1 },
  mealCaloriesContainer: { alignItems: 'flex-end' },
  mealCaloriesValue: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  mealCaloriesLabel: { fontSize: 12, lineHeight: 16 },
  registerMealBtn: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  registerMealBtnText: { fontSize: 16, fontWeight: '700' },
  manualButton: { alignSelf: 'center', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  insightCard: { padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  insightIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightContent: { flex: 1, minWidth: 0, gap: 4 },
  insightHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  insightTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  insightBadge: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  insightBadgeText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  insightDesc: { fontSize: 14, lineHeight: 20 },
  chartSection: { gap: 10, marginTop: 8 },
  chartCard: { padding: 16, borderWidth: 1 },
  chartBarsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 104 },
  chartBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  chartBarFill: { width: 18, borderRadius: 6 },
  chartBarToday: { width: 18, borderRadius: 6, borderWidth: 2, borderStyle: 'dashed' },
  chartBarLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  chartBarLabelToday: { fontWeight: '800' },
  chartSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  chartSummaryDot: { width: 8, height: 8, borderRadius: 2 },
  chartSummaryText: { fontSize: 12, lineHeight: 16, flexShrink: 1 },
  fab: { position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 8, zIndex: 20 },
});
