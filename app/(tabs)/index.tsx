import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Pressable, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import { BaseScreen, Card, ProgressBar, CircularProgress } from '../../src/components';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, globalColors, toggleTheme, theme } = useTheme();
  const { state, addWater } = useAppState();
  const { profile, goals, meals, waterIntake } = state;
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [headerEntrance] = useState(() => new Animated.Value(0));
  const [bodyEntrance] = useState(() => new Animated.Value(0));
  const [backgroundMotion] = useState(() => new Animated.Value(0));

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
    const entrance = Animated.stagger(130, [
      Animated.spring(headerEntrance, { toValue: 1, damping: 14, stiffness: 115, mass: 0.8, useNativeDriver: true }),
      Animated.spring(bodyEntrance, { toValue: 1, damping: 15, stiffness: 105, mass: 0.8, useNativeDriver: true }),
    ]);
    const floatingBackground = Animated.loop(Animated.sequence([
      Animated.timing(backgroundMotion, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(backgroundMotion, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

  return (
    <BaseScreen edges={['left', 'right']}>
      {/* ScrollView with customized padding bottom to accommodate navigation bar */}
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        {/* GREEN GRADIENT HEADER */}
        <LinearGradient
          colors={['#22C566', '#1AAF5D', '#0F8045']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.greenHeader}
        >
          <Animated.View pointerEvents="none" style={[styles.headerOrbLarge, { transform: [{ translateY: orbTranslate }, { scale: orbScale }] }]} />
          <Animated.View pointerEvents="none" style={[styles.headerOrbSmall, { transform: [{ translateY: Animated.multiply(orbTranslate, -0.6) }] }]} />
          {/* Status bar offset */}
          <View style={styles.statusBarSpacer} />

          {/* User Row & Actions */}
          <Animated.View style={[styles.userRow, { opacity: headerEntrance, transform: [{ translateY: headerTranslate }] }]}>
            <View style={styles.userCopy}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.username, compact && styles.usernameCompact]}>{profile.name} 👋</Text>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {profile.streak} dias seguidos</Text>
              </View>
            </View>

            <View style={[styles.headerActions, compact && styles.headerActionsCompact]}>
              <Pressable style={[styles.headerIcon, compact && styles.headerIconCompact]} onPress={toggleTheme}>
                <Text style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
              </Pressable>
              <Pressable style={[styles.headerIcon, compact && styles.headerIconCompact]} onPress={() => router.push('/sub-screens/notifications')}>
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable style={[styles.headerIcon, compact && styles.headerIconCompact]} onPress={() => router.push('/(tabs)/profile')}>
                <Ionicons name="person-outline" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </Animated.View>

          {/* Calorie Progress Ring Card */}
          <Animated.View style={[styles.glassCard, { opacity: headerEntrance, transform: [{ scale: headerEntrance }] }]}>
            <View style={[styles.calorieCardContent, compact && styles.calorieCardContentCompact]}>
              <CircularProgress 
                percentage={caloriePercentage} 
                size={compact ? 74 : 88}
                strokeWidth={compact ? 8 : 9}
                color="#FFFFFF"
                trackColor="rgba(255, 255, 255, 0.15)"
                textColor="#FFFFFF"
              />
              <View style={styles.calorieCardInfo}>
                <Text style={styles.calorieLabel}>Calorias hoje</Text>
                <View style={styles.calorieValueContainer}>
                  <Text style={[styles.calorieValue, compact && styles.calorieValueCompact]}>{roundedTotals.calories.toLocaleString('pt-BR')}</Text>
                  <Text style={styles.calorieTarget}>/ {goals.calories} kcal</Text>
                </View>
                <ProgressBar
                  progress={caloriePercentage / 100}
                  color="#FFFFFF"
                  trackColor="rgba(255, 255, 255, 0.2)"
                  height={5}
                />
                <Text style={styles.calorieRemainingText}>
                  Faltam <Text style={{ fontWeight: '700' }}>{caloriesRemaining} kcal</Text> para sua meta
                </Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={[styles.bodyContent, { opacity: bodyEntrance, transform: [{ translateY: bodyTranslate }] }]}>
          {/* MACROS ROW */}
          <View style={styles.macrosRow}>
            {/* Protein */}
            <Card style={styles.macroPill}>
              <Text style={[styles.macroValue, { color: globalColors.protein }]}>{roundedTotals.protein}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Proteína</Text>
              <ProgressBar
                progress={proteinProgress}
                color={globalColors.protein}
                style={styles.macroProgress}
              />
            </Card>

            {/* Carbs */}
            <Card style={styles.macroPill}>
              <Text style={[styles.macroValue, { color: globalColors.carbs }]}>{roundedTotals.carbs}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Carboidrato</Text>
              <ProgressBar
                progress={carbsProgress}
                color={globalColors.carbs}
                style={styles.macroProgress}
              />
            </Card>

            {/* Fat */}
            <Card style={styles.macroPill}>
              <Text style={[styles.macroValue, { color: globalColors.fat }]}>{roundedTotals.fat}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Gordura</Text>
              <ProgressBar
                progress={fatProgress}
                color={globalColors.fat}
                style={styles.macroProgress}
              />
            </Card>
          </View>

          {/* HYDRATION TRACKER */}
          <Card style={[styles.waterCard, { borderColor: colors.borderColor }]}>
            <View style={[styles.waterIconContainer, { backgroundColor: '#EEF4FF' }]}>
              <Text style={{ fontSize: 20 }}>💧</Text>
            </View>
            <View style={styles.waterInfo}>
              <View style={styles.waterHeaderRow}>
                <Text style={[styles.waterTitle, { color: colors.textMain }]}>Hidratação</Text>
                <Text style={[styles.waterValueText, { color: globalColors.water }]}>
                  {(waterIntake / 1000).toFixed(1)} / {(goals.water / 1000).toFixed(1)}L
                </Text>
              </View>
              <ProgressBar
                progress={waterProgress}
                color={globalColors.water}
              />
            </View>
            <View style={styles.waterControls}>
              <Pressable 
                onPress={() => addWater(-250)}
                style={[styles.waterBtn, { backgroundColor: '#EEF4FF' }]}
              >
                <Text style={[styles.waterBtnText, { color: globalColors.water }]}>−</Text>
              </Pressable>
              <Pressable 
                onPress={() => addWater(250)}
                style={[styles.waterBtn, { backgroundColor: '#EEF4FF' }]}
              >
                <Text style={[styles.waterBtnText, { color: globalColors.water }]}>+</Text>
              </Pressable>
            </View>
          </Card>

          {profile.motivation ? (
            <Pressable onPress={() => router.push('/(tabs)/goals')}>
              <Card style={[styles.motivationCard, { borderColor: `${globalColors.primary}35` }]}>
                <View style={[styles.motivationIcon, { backgroundColor: `${globalColors.primary}18` }]}>
                  <Ionicons name="heart" size={19} color={globalColors.primary} />
                </View>
                <View style={styles.motivationCopy}>
                  <Text style={[styles.motivationEyebrow, { color: globalColors.primary }]}>LEMBRE-SE DO SEU PORQUÊ</Text>
                  <Text style={[styles.motivationText, { color: colors.textMain }]} numberOfLines={3}>{profile.motivation}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </Card>
            </Pressable>
          ) : null}

          {/* TODAY'S MEALS SECTION */}
          <View style={styles.mealsSection}>
            <View style={styles.mealsHeader}>
              <Text style={[styles.mealsTitle, { color: colors.textMain }]}>Refeições de hoje</Text>
              <Pressable onPress={() => router.push('/(tabs)/analytics')}>
                <Text style={[styles.seeAllText, { color: globalColors.primary }]}>Ver histórico →</Text>
              </Pressable>
            </View>

            {todayMeals.length === 0 ? (
              <Card style={styles.emptyMealsCard}>
                <Text style={[styles.emptyMealsText, { color: colors.textMuted }]}>
                  Nenhuma refeição registrada hoje.
                </Text>
              </Card>
            ) : (
              todayMeals.map((meal) => (
                <Card 
                  key={meal.id} 
                  style={[styles.mealCard, { borderColor: colors.borderColor }]}
                  onPress={() => router.push({
                    pathname: '/(modals)/meal-edit',
                    params: { mealId: meal.id }
                  })}
                >
                  <View style={styles.mealCardRow}>
                    <View style={[styles.mealEmojiContainer, { backgroundColor: colors.inputBg }]}>
                      <Text style={{ fontSize: 24 }}>{meal.emoji}</Text>
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealName, { color: colors.textMain }]}>{meal.name}</Text>
                      <Text style={[styles.mealMeta, { color: colors.textMuted }]}>
                        {meal.type} · {meal.time}
                      </Text>
                      <Text style={[styles.mealMacros, { color: colors.textLight }]}>
                        P: {Math.round(meal.protein * meal.portions)}g  C: {Math.round(meal.carbs * meal.portions)}g  G: {Math.round(meal.fat * meal.portions)}g
                      </Text>
                    </View>
                    <View style={styles.mealCaloriesContainer}>
                      <Text style={[styles.mealCaloriesValue, { color: colors.textMain }]}>
                        {Math.round(meal.calories * meal.portions)}
                      </Text>
                      <Text style={[styles.mealCaloriesLabel, { color: colors.textLight }]}>kcal</Text>
                    </View>
                  </View>
                </Card>
              ))
            )}

            <Pressable 
              onPress={() => router.push('/(tabs)/scanner')}
              style={[styles.registerMealBtn, { borderColor: globalColors.primary }]}
            >
              <Ionicons name="scan-outline" size={18} color={globalColors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.registerMealBtnText, { color: globalColors.primary }]}>
                Registrar refeição
              </Text>
            </Pressable>
          </View>

          {/* AI INSIGHT */}
          <Card 
            style={[styles.insightCard, { backgroundColor: theme === 'dark' ? 'rgba(39,199,107,0.06)' : 'rgba(39,199,107,0.12)', borderColor: 'rgba(39,199,107,0.2)' }]}
            onPress={() => router.push('/(modals)/ai-chat')}
          >
            <View style={[styles.insightIconContainer, { backgroundColor: globalColors.primary }]}>
              <Text style={{ fontSize: 18 }}>🤖</Text>
            </View>
            <View style={styles.insightContent}>
              <View style={styles.insightHeaderRow}>
                <Text style={[styles.insightTitle, { color: theme === 'dark' ? '#27C76B' : '#0F6E3A' }]}>
                  Insight da IA
                </Text>
                <View style={[styles.insightBadge, { backgroundColor: 'rgba(39,199,107,0.2)' }]}>
                  <Text style={[styles.insightBadgeText, { color: globalColors.primary }]}>Conversar</Text>
                </View>
              </View>
              <Text style={[styles.insightDesc, { color: theme === 'dark' ? '#CBD0D8' : '#0F6E3A' }]}>
                {proteinInsight}
              </Text>
            </View>
          </Card>

          {/* WEEKLY CHART */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: colors.textMain }]}>Minha semana</Text>
              <Pressable onPress={() => router.push('/(tabs)/analytics')}>
                <Text style={[styles.seeAllText, { color: globalColors.primary }]}>Ver tudo →</Text>
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
                          backgroundColor: day.isToday ? `${globalColors.primary}10` : globalColors.primary,
                          opacity: day.calories > 0 ? (day.isToday ? 1 : 0.72) : 0.2,
                        },
                      ]} />
                      <Text style={[
                        day.isToday ? styles.chartBarLabelToday : styles.chartBarLabel,
                        { color: day.isToday ? globalColors.primary : colors.textLight },
                      ]}>{day.label}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartSummary}>
                <View style={[styles.chartSummaryDot, { backgroundColor: globalColors.primary }]} />
                <Text style={[styles.chartSummaryText, { color: colors.textLight }]}>
                  Média dos últimos 7 dias: {weekAverage} kcal · Meta: {goals.calories} kcal
                </Text>
              </View>
            </Card>
          </View>
          
          {/* Scroll view safe margin at the bottom */}
          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>

      {/* Botão Flutuante (FAB) do Chat IA */}
      <Pressable 
        style={[styles.fab, { backgroundColor: globalColors.primary }]}
        onPress={() => router.push('/(modals)/ai-chat')}
      >
        <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
      </Pressable>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  greenHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  headerOrbLarge: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.09)',
    top: -82,
    right: -72,
  },
  headerOrbSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 18,
    borderColor: 'rgba(255,255,255,0.07)',
    left: -36,
    bottom: 24,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 28,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  userCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '500',
  },
  username: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  usernameCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  streakBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FF7A35',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    shadowColor: '#F56520',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionsCompact: {
    gap: 5,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  calorieCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  calorieCardContentCompact: {
    gap: 12,
  },
  calorieCardInfo: {
    flex: 1,
  },
  calorieLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  calorieValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  calorieValueCompact: {
    fontSize: 26,
  },
  calorieTarget: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  calorieRemainingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 6,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroPill: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  macroProgress: {
    marginTop: 7,
    width: '100%',
  },
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
  },
  waterIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  waterTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  waterValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  waterControls: {
    flexDirection: 'row',
    gap: 4,
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  motivationIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  motivationCopy: { flex: 1 },
  motivationEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  motivationText: { fontSize: 13, lineHeight: 18, fontWeight: '700', paddingRight: 8 },
  waterBtn: {
    width: 34,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealsSection: {
    marginVertical: 12,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealsTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyMealsCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMealsText: {
    fontSize: 14,
  },
  mealCard: {
    padding: 15,
    marginBottom: 10,
  },
  mealCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '700',
  },
  mealMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  mealMacros: {
    fontSize: 11,
    marginTop: 4,
  },
  mealCaloriesContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mealCaloriesValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  mealCaloriesLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  registerMealBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    width: '100%',
  },
  registerMealBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightCard: {
    flexDirection: 'row',
    padding: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  insightIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  insightBadge: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  insightBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  insightDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  chartSection: {
    marginVertical: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  chartCard: {
    padding: 16,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 6,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartBarToday: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  chartBarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartBarLabelToday: {
    fontSize: 10,
    fontWeight: '800',
  },
  chartSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  chartSummaryDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  chartSummaryText: {
    fontSize: 11,
  },
  bottomSpacer: {
    height: 100, // Reserve space so bottom tabs don't cut off anything
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 999,
  },
});
