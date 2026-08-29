import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Card, Button } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

export default function MealResultModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, globalColors, theme } = useTheme();
  const { mockScannerScan, addMeal } = useAppState();

  const foodName = (params.foodName as string) || 'Salada com Frango';
  const imageUri = params.imageUri as string | undefined;
  const scannedDataStr = params.scannedData as string | undefined;
  
  // Parse scannedData if available, otherwise fallback to mockScannerScan
  const mealData = React.useMemo(() => {
    if (scannedDataStr) {
      try {
        const parsed = JSON.parse(scannedDataStr);
        const itemsWithId = (parsed.items || []).map((item: any, idx: number) => ({
          id: item.id || `gemini-item-${idx}`,
          name: item.name || '',
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          amount: item.amount || '1 porção'
        }));
        return {
          name: parsed.name || foodName,
          emoji: parsed.emoji || '🥗',
          calories: parsed.calories || 0,
          protein: parsed.protein || 0,
          carbs: parsed.carbs || 0,
          fat: parsed.fat || 0,
          confidence: parsed.confidence || 85,
          portions: parsed.portions || 1,
          items: itemsWithId,
          insights: parsed.insights,
          type: 'Almoço' as const
        };
      } catch (err) {
        console.error("Erro ao fazer parse dos dados escaneados:", err);
        return mockScannerScan(foodName);
      }
    }
    return mockScannerScan(foodName);
  }, [scannedDataStr, foodName]);

  const handleSave = () => {
    // Add the meal to the global state history
    addMeal(mealData);
    // Go back to the dashboard index
    router.dismissAll();
    router.replace('/(tabs)');
  };

  const handleAdjust = () => {
    // Navigate to meal-edit modal passing current params and scannedData
    router.push({
      pathname: '/(modals)/meal-edit',
      params: { 
        foodName,
        mode: 'adjust',
        scannedData: scannedDataStr
      }
    });
  };

  return (
    <BaseScreen edges={['left', 'right']} style={{ backgroundColor: colors.bgApp }}>
      {/* Scrollable area */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        {/* GREEN HEADER BLOCK */}
        <LinearGradient
          colors={['#22C566', '#1AAF5D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBlock}
        >
          {/* Action Row */}
          <View style={styles.headerActionRow}>
            <Pressable 
              onPress={() => router.dismiss()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Resultado da análise</Text>
            <Pressable onPress={handleAdjust} style={styles.editBtnTextContainer}>
              <Text style={styles.editBtnText}>Editar</Text>
            </Pressable>
          </View>

          {/* Scanned Food Info */}
          <View style={styles.foodInfoRow}>
            <View style={styles.emojiContainer}>
              {imageUri ? (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.scannedImage} 
                  contentFit="cover" 
                />
              ) : (
                <Text style={{ fontSize: 32 }}>{mealData.emoji}</Text>
              )}
            </View>
            <View style={styles.foodInfoText}>
              <Text style={styles.foodNameText}>{mealData.name}</Text>
              <Text style={styles.foodMetaText}>
                IA identificou {mealData.items.length} itens · {mealData.portions} porção
              </Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{mealData.confidence}% ✓</Text>
            </View>
          </View>

          {/* Core Macros Grid */}
          <View style={styles.macrosSummaryRow}>
            {/* Calories */}
            <View style={styles.macroSummaryBox}>
              <Text style={styles.macroSummaryVal}>{Math.round(mealData.calories * mealData.portions)}</Text>
              <Text style={styles.macroSummaryLbl}>kcal</Text>
            </View>
            {/* Protein */}
            <View style={styles.macroSummaryBox}>
              <Text style={styles.macroSummaryVal}>{Math.round(mealData.protein * mealData.portions)}g</Text>
              <Text style={styles.macroSummaryLbl}>proteína</Text>
            </View>
            {/* Carbs */}
            <View style={styles.macroSummaryBox}>
              <Text style={styles.macroSummaryVal}>{Math.round(mealData.carbs * mealData.portions)}g</Text>
              <Text style={styles.macroSummaryLbl}>carbos</Text>
            </View>
            {/* Fat */}
            <View style={styles.macroSummaryBox}>
              <Text style={styles.macroSummaryVal}>{Math.round(mealData.fat * mealData.portions)}g</Text>
              <Text style={styles.macroSummaryLbl}>gordura</Text>
            </View>
          </View>
        </LinearGradient>

        {/* DETECTED ITEMS LIST */}
        <View style={styles.bodyContent}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Itens detectados pela IA</Text>

          <View style={styles.itemsList}>
            {mealData.items.map((item: any) => (
              <Card key={item.id} style={[styles.itemCard, { borderColor: colors.borderColor }]}>
                <View style={styles.itemRow}>
                  <View style={styles.itemMainInfo}>
                    <Text style={[styles.itemName, { color: colors.textMain }]}>{item.name}</Text>
                    <Text style={[styles.itemAmount, { color: colors.textLight }]}>{item.amount}</Text>
                  </View>
                  <View style={styles.itemNutrients}>
                    <Text style={[styles.itemCalories, { color: colors.textMain }]}>{item.calories} kcal</Text>
                    <Text style={[styles.itemMacrosDetail, { color: colors.textMuted }]}>
                      P: {item.protein}g · C: {item.carbs}g · G: {item.fat}g
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          {/* AI Score Balance Insight */}
          <Card style={[styles.insightCard, { backgroundColor: theme === 'dark' ? 'rgba(39,199,107,0.06)' : 'rgba(39,199,107,0.12)', borderColor: 'rgba(39,199,107,0.2)' }]}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: theme === 'dark' ? '#27C76B' : '#0F6E3A' }]}>
                Insight Nutricional ✨
              </Text>
              <Text style={[styles.insightDesc, { color: theme === 'dark' ? '#CBD0D8' : '#0F6E3A' }]}>
                {mealData.insights || "Ótima fonte de proteína magra e baixa densidade calórica. Alinha-se muito bem com seus objetivos diários."}
              </Text>
            </View>
          </Card>

          {/* Action CTAs */}
          <View style={styles.actionsPanel}>
            <Button
              title="Salvar refeição"
              onPress={handleSave}
              variant="primary"
              style={styles.saveBtn}
              icon={<Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />}
            />
            <Button
              title="Ajustar itens manualmente"
              onPress={handleAdjust}
              variant="secondary"
              style={styles.adjustBtn}
            />
            <Button
              title="Descartar"
              onPress={() => router.dismiss()}
              variant="ghost"
              style={{ color: globalColors.danger } as any}
            />
          </View>
        </View>
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
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBtnTextContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  foodInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  scannedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  foodInfoText: {
    flex: 1,
  },
  foodNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  foodMetaText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  macrosSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroSummaryBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  macroSummaryVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  macroSummaryLbl: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 2,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom: 12,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemCard: {
    padding: 14,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMainInfo: {
    flex: 1.2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  itemNutrients: {
    alignItems: 'flex-end',
    flex: 1,
  },
  itemCalories: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemMacrosDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  insightCard: {
    flexDirection: 'row',
    padding: 15,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  insightDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsPanel: {
    gap: 10,
    marginBottom: 40,
  },
  saveBtn: {
    height: 54,
  },
  adjustBtn: {
    height: 52,
  },
});

