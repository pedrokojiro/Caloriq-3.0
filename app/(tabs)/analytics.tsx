import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Card, ProgressBar } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyticsScreen() {
  const { colors, globalColors } = useTheme();
  const { state } = useAppState();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'threeMonths'>('week');

  // Dynamic statistics from app state
  const currentStreak = state.profile.streak;
  const targetCalories = state.goals.calories;

  // Mock historical data for the weekly logs
  const historyData = [
    { day: 'Seg', calories: 1890, protein: 115, carbs: 190, fat: 58, goalReached: true },
    { day: 'Ter', calories: 2050, protein: 152, carbs: 210, fat: 66, goalReached: true },
    { day: 'Qua', calories: 1720, protein: 108, carbs: 175, fat: 52, goalReached: false },
    { day: 'Qui', calories: 1980, protein: 140, carbs: 195, fat: 60, goalReached: true },
    { day: 'Sex', calories: 1610, protein: 95, carbs: 160, fat: 48, goalReached: false },
    { day: 'Sáb', calories: 2100, protein: 135, carbs: 230, fat: 68, goalReached: true },
    { day: 'Dom', calories: 1840, protein: 124, carbs: 186, fat: 58, goalReached: true },
  ];

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Analytics</Text>
        <View style={[styles.pillTabs, { backgroundColor: colors.inputBg, borderColor: colors.borderColor }]}>
          <Pressable
            onPress={() => setSelectedPeriod('week')}
            style={[styles.pillTab, selectedPeriod === 'week' && [styles.pillTabActive, { backgroundColor: colors.bgCard }]]}
          >
            <Text style={[styles.pillTabText, selectedPeriod === 'week' ? { color: colors.textMain } : { color: colors.textLight }]}>
              7 dias
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedPeriod('month')}
            style={[styles.pillTab, selectedPeriod === 'month' && [styles.pillTabActive, { backgroundColor: colors.bgCard }]]}
          >
            <Text style={[styles.pillTabText, selectedPeriod === 'month' ? { color: colors.textMain } : { color: colors.textLight }]}>
              Mês
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedPeriod('threeMonths')}
            style={[styles.pillTab, selectedPeriod === 'threeMonths' && [styles.pillTabActive, { backgroundColor: colors.bgCard }]]}
          >
            <Text style={[styles.pillTabText, selectedPeriod === 'threeMonths' ? { color: colors.textMain } : { color: colors.textLight }]}>
              3 meses
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          {/* Card 1: Media Diaria */}
          <Card style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={[styles.statCardLabel, { color: colors.textLight }]}>Média diária</Text>
              <View style={[styles.trendBadge, { backgroundColor: '#EDFBF3' }]}>
                <Text style={[styles.trendText, { color: globalColors.primary }]}>↑ 3%</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: colors.textMain }]}>1.840</Text>
            <Text style={[styles.statCardSub, { color: colors.textLight }]}>kcal / dia</Text>
          </Card>

          {/* Card 2: Meta Atingida */}
          <Card style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={[styles.statCardLabel, { color: colors.textLight }]}>Meta atingida</Text>
              <View style={[styles.trendBadge, { backgroundColor: '#EEF4FF' }]}>
                <Text style={[styles.trendText, { color: globalColors.water }]}>71%</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: colors.textMain }]}>5/7</Text>
            <View style={styles.squaresRow}>
              {historyData.map((data, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.squareDot, 
                    { backgroundColor: data.goalReached ? globalColors.primary : colors.inputBorder }
                  ]} 
                />
              ))}
            </View>
          </Card>

          {/* Card 3: Proteina Media */}
          <Card style={styles.statCard}>
            <Text style={[styles.statCardLabel, { color: colors.textLight, marginBottom: 8 }]}>Proteína méd.</Text>
            <Text style={[styles.statCardValue, { color: globalColors.protein }]}>124g</Text>
            <Text style={[styles.statCardSub, { color: colors.textLight }]}>meta: 150g</Text>
            <ProgressBar
              progress={124/150}
              color={globalColors.protein}
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Card 4: Streak */}
          <Card style={styles.statCard}>
            <Text style={[styles.statCardLabel, { color: colors.textLight, marginBottom: 8 }]}>Streak atual</Text>
            <Text style={[styles.statCardValue, { color: colors.textMain }]}>{currentStreak} 🔥</Text>
            <Text style={[styles.statCardSub, { color: colors.textLight }]}>dias seguidos</Text>
          </Card>
        </View>

        {/* CALORIE DAILY CHART */}
        <Card style={[styles.chartCard, { borderColor: colors.borderColor }]}>
          <View style={styles.chartCardHeaderRow}>
            <Text style={[styles.chartCardTitle, { color: colors.textMain }]}>Calorias diárias</Text>
            <View style={[styles.chip, { backgroundColor: colors.inputBg }]}>
              <Text style={[styles.chipText, { color: colors.textMuted }]}>Meta: {targetCalories}</Text>
            </View>
          </View>
          
          <View style={styles.chartContainer}>
            {/* Limit Target Line */}
            <View style={[styles.chartTargetLine, { borderColor: `${globalColors.primary}40` }]}>
              <Text style={[styles.chartTargetLineText, { color: globalColors.primary }]}>meta</Text>
            </View>

            <View style={styles.barsRow}>
              {historyData.map((data, index) => {
                const heightPercentage = Math.min(100, (data.calories / 2500) * 100);
                return (
                  <View key={index} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: `${heightPercentage}%`, 
                            backgroundColor: data.goalReached ? globalColors.primary : '#CBD0D8' 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textLight }]}>{data.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={[styles.chartInsightText, { color: colors.textMuted }]}>
            Você atingiu a meta na maioria dos dias esta semana. Continue assim! 🚀
          </Text>
        </Card>

        {/* MACRO DISTRIBUTION */}
        <Card style={[styles.macrosCard, { borderColor: colors.borderColor }]}>
          <Text style={[styles.macrosTitle, { color: colors.textMain }]}>Distribuição de macros</Text>
          <Text style={[styles.macrosSubtitle, { color: colors.textLight }]}>Média da semana</Text>

          <View style={styles.macroProgressItem}>
            <View style={styles.macroProgressHeader}>
              <Text style={[styles.macroProgressName, { color: colors.textMain }]}>Proteína</Text>
              <Text style={[styles.macroProgressValue, { color: globalColors.protein }]}>124g / 150g</Text>
            </View>
            <ProgressBar progress={124/150} color={globalColors.protein} />
          </View>

          <View style={styles.macroProgressItem}>
            <View style={styles.macroProgressHeader}>
              <Text style={[styles.macroProgressName, { color: colors.textMain }]}>Carboidrato</Text>
              <Text style={[styles.macroProgressValue, { color: globalColors.carbs }]}>186g / 200g</Text>
            </View>
            <ProgressBar progress={186/200} color={globalColors.carbs} />
          </View>

          <View style={styles.macroProgressItem}>
            <View style={styles.macroProgressHeader}>
              <Text style={[styles.macroProgressName, { color: colors.textMain }]}>Gordura</Text>
              <Text style={[styles.macroProgressValue, { color: globalColors.fat }]}>58g / 65g</Text>
            </View>
            <ProgressBar progress={58/65} color={globalColors.fat} />
          </View>
        </Card>

        {/* HISTORY LIST */}
        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: colors.textMain }]}>Histórico recente</Text>
          
          <Card style={[styles.historyItem, { borderColor: colors.borderColor }]}>
            <View style={styles.historyRow}>
              <View>
                <Text style={[styles.historyDay, { color: colors.textMain }]}>Terça-feira, 23 Jun</Text>
                <Text style={[styles.historyMacros, { color: colors.textLight }]}>P: 152g · C: 210g · G: 66g</Text>
              </View>
              <View style={styles.historyCalories}>
                <Text style={[styles.historyKcal, { color: globalColors.primary }]}>2.050 kcal</Text>
                <Text style={[styles.historyStatus, { color: globalColors.primary }]}>Meta batida ✓</Text>
              </View>
            </View>
          </Card>

          <Card style={[styles.historyItem, { borderColor: colors.borderColor }]}>
            <View style={styles.historyRow}>
              <View>
                <Text style={[styles.historyDay, { color: colors.textMain }]}>Segunda-feira, 22 Jun</Text>
                <Text style={[styles.historyMacros, { color: colors.textLight }]}>P: 115g · C: 190g · G: 58g</Text>
              </View>
              <View style={styles.historyCalories}>
                <Text style={[styles.historyKcal, { color: colors.textMain }]}>1.890 kcal</Text>
                <Text style={[styles.historyStatus, { color: colors.textLight }]}>Dentro da meta</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        paddingTop: 48,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  pillTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  pillTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pillTabActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pillTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48.5%',
    padding: 16,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statCardSub: {
    fontSize: 12,
  },
  squaresRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 8,
  },
  squareDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  chartCard: {
    padding: 18,
    marginBottom: 14,
  },
  chartCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  chartCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    height: 150,
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: 16,
  },
  chartTargetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 50, // Arbitrary line representing meta
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  chartTargetLineText: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#FFFFFF', // To cover line
    paddingHorizontal: 4,
    marginTop: -8,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    width: '10%',
  },
  barTrack: {
    height: 100,
    width: 10,
    backgroundColor: '#F0F1F3',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  chartInsightText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  macrosCard: {
    padding: 18,
    marginBottom: 14,
  },
  macrosTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  macrosSubtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  macroProgressItem: {
    marginBottom: 14,
  },
  macroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroProgressName: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroProgressValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  historySection: {
    marginVertical: 12,
  },
  historySectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  historyItem: {
    padding: 16,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDay: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyMacros: {
    fontSize: 12,
    marginTop: 4,
  },
  historyCalories: {
    alignItems: 'flex-end',
  },
  historyKcal: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 100,
  },
});

