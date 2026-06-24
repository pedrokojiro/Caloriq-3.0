import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ScrollView } from 'react-native';
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

  // Calculate totals from meals
  const totals = meals.reduce(
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

  const caloriePercentage = Math.min(100, Math.round((roundedTotals.calories / goals.calories) * 100)) || 0;
  const caloriesRemaining = Math.max(0, goals.calories - roundedTotals.calories);

  const proteinProgress = Math.min(1, roundedTotals.protein / goals.protein) || 0;
  const carbsProgress = Math.min(1, roundedTotals.carbs / goals.carbs) || 0;
  const fatProgress = Math.min(1, roundedTotals.fat / goals.fat) || 0;

  const waterProgress = Math.min(1, waterIntake / goals.water) || 0;

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
          {/* Status bar offset */}
          <View style={styles.statusBarSpacer} />

          {/* User Row & Actions */}
          <View style={styles.userRow}>
            <View>
              <Text style={styles.greeting}>Bom dia,</Text>
              <Text style={styles.username}>{profile.name} 👋</Text>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {profile.streak} dias seguidos</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.headerIcon} onPress={toggleTheme}>
                <Text style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
              </Pressable>
              <Pressable style={styles.headerIcon} onPress={() => router.push('/sub-screens/notifications')}>
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.headerIcon} onPress={() => router.push('/(tabs)/profile')}>
                <Ionicons name="person-outline" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Calorie Progress Ring Card */}
          <View style={styles.glassCard}>
            <View style={styles.calorieCardContent}>
              <CircularProgress 
                percentage={caloriePercentage} 
                size={88}
                strokeWidth={9}
                color="#FFFFFF"
                trackColor="rgba(255, 255, 255, 0.15)"
                textColor="#FFFFFF"
              />
              <View style={styles.calorieCardInfo}>
                <Text style={styles.calorieLabel}>Calorias hoje</Text>
                <View style={styles.calorieValueContainer}>
                  <Text style={styles.calorieValue}>{roundedTotals.calories.toLocaleString('pt-BR')}</Text>
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
          </View>
        </LinearGradient>

        <View style={styles.bodyContent}>
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

          {/* TODAY'S MEALS SECTION */}
          <View style={styles.mealsSection}>
            <View style={styles.mealsHeader}>
              <Text style={[styles.mealsTitle, { color: colors.textMain }]}>Refeições de hoje</Text>
              <Pressable onPress={() => router.push('/(tabs)/analytics')}>
                <Text style={[styles.seeAllText, { color: globalColors.primary }]}>Ver histórico →</Text>
              </Pressable>
            </View>

            {meals.length === 0 ? (
              <Card style={styles.emptyMealsCard}>
                <Text style={[styles.emptyMealsText, { color: colors.textMuted }]}>
                  Nenhuma refeição registrada hoje.
                </Text>
              </Card>
            ) : (
              meals.map((meal) => (
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
                Você está 23% abaixo da meta de proteína. Considere adicionar um lanche proteico no fim do dia. 💪
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
                {/* Seg */}
                <View style={styles.chartBarCol}>
                  <View style={[styles.chartBarFill, { height: 56, backgroundColor: `${globalColors.primary}40` }]} />
                  <Text style={[styles.chartBarLabel, { color: colors.textLight }]}>Seg</Text>
                </View>
                {/* Ter */}
                <View style={styles.chartBarCol}>
                  <View style={[styles.chartBarFill, { height: 68, backgroundColor: globalColors.primary }]} />
                  <Text style={[styles.chartBarLabel, { color: colors.textLight }]}>Ter</Text>
                </View>
                {/* Qua */}
                <View style={styles.chartBarCol}>
                  <View style={[styles.chartBarFill, { height: 48, backgroundColor: `${globalColors.primary}40` }]} />
                  <Text style={[styles.chartBarLabel, { color: colors.textLight }]}>Qua</Text>
                </View>
                {/* Qui */}
                <View style={styles.chartBarCol}>
                  <View style={[styles.chartBarFill, { height: 62, backgroundColor: globalColors.primaryDark }]} />
                  <Text style={[styles.chartBarLabel, { color: colors.textLight }]}>Qui</Text>
                </View>
                {/* Sex */}
                <View style={styles.chartBarCol}>
                  <View style={[styles.chartBarFill, { height: 42, backgroundColor: `${globalColors.primary}60` }]} />
                  <Text style={[styles.chartBarLabel, { color: colors.textLight }]}>Sex</Text>
                </View>
                {/* Sáb */}
                <View style={styles.chartBarCol}>
                  <View style={[styles.chartBarFill, { height: 52, backgroundColor: globalColors.primary }]} />
                  <Text style={[styles.chartBarLabel, { color: colors.textLight }]}>Sáb</Text>
                </View>
                {/* Hoje */}
                <View style={styles.chartBarCol}>
                  <View 
                    style={[
                      styles.chartBarToday, 
                      { 
                        height: Math.min(80, Math.max(15, (roundedTotals.calories / goals.calories) * 80)),
                        borderColor: globalColors.primary,
                        backgroundColor: `${globalColors.primary}10`,
                      }
                    ]} 
                  />
                  <Text style={[styles.chartBarLabelToday, { color: globalColors.primary }]}>Hoje</Text>
                </View>
              </View>
              <View style={styles.chartSummary}>
                <View style={[styles.chartSummaryDot, { backgroundColor: globalColors.primary }]} />
                <Text style={[styles.chartSummaryText, { color: colors.textLight }]}>
                  Média: {roundedTotals.calories} kcal · Meta: {goals.calories} kcal
                </Text>
              </View>
            </Card>
          </View>
          
          {/* Scroll view safe margin at the bottom */}
          <View style={styles.bottomSpacer} />
        </View>
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

