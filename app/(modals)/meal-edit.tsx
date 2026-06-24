import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Button, Card, Input } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { Meal, MealItem, MealType } from '../../src/types';

export default function MealEditModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, globalColors } = useTheme();
  const { state, addMeal, updateMeal, deleteMeal, mockScannerScan } = useAppState();

  const { mealId, foodName, mode, scannedData } = params;

  // Local state for the editable meal
  const [name, setName] = useState('Refeição');
  const [type, setType] = useState<MealType>('Almoço');
  const [portions, setPortions] = useState(1);
  const [items, setItems] = useState<MealItem[]>([]);

  // Load initial data based on mode
  useEffect(() => {
    if (mealId) {
      // Mode 1: Edit existing logged meal
      const existingMeal = state.meals.find((m) => m.id === mealId);
      if (existingMeal) {
        setName(existingMeal.name);
        setType(existingMeal.type);
        setPortions(existingMeal.portions);
        setItems([...existingMeal.items]);
      }
    } else if (foodName) {
      // Mode 2: Adjust newly scanned food
      let initialData;
      if (scannedData) {
        try {
          initialData = JSON.parse(scannedData as string);
        } catch (err) {
          console.error("Erro ao fazer parse no meal-edit:", err);
        }
      }
      if (!initialData) {
        initialData = mockScannerScan(foodName as string);
      }
      setName(initialData.name);
      setType(initialData.type || 'Almoço');
      setPortions(initialData.portions || 1);
      
      const itemsWithId = (initialData.items || []).map((item: any, idx: number) => ({
        id: item.id || `gemini-item-${idx}`,
        name: item.name || '',
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        amount: item.amount || '1 porção'
      }));
      setItems(itemsWithId);
    } else if (mode === 'create') {
      // Mode 3: Create from scratch
      setName('Refeição Manual');
      setType('Almoço');
      setPortions(1);
      setItems([
        { id: '1', name: 'Alimento 1', calories: 100, protein: 10, carbs: 12, fat: 2, amount: '100g' }
      ]);
    }
  }, [mealId, foodName, mode]);

  // Recalculate macro sums
  const getTotals = () => {
    const rawTotal = items.reduce(
      (acc, item) => {
        acc.calories += (item.calories || 0);
        acc.protein += (item.protein || 0);
        acc.carbs += (item.carbs || 0);
        acc.fat += (item.fat || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      calories: Math.round(rawTotal.calories * portions),
      protein: Math.round(rawTotal.protein * portions),
      carbs: Math.round(rawTotal.carbs * portions),
      fat: Math.round(rawTotal.fat * portions),
    };
  };

  const totals = getTotals();

  const handleUpdateItem = (itemId: string, field: keyof MealItem, val: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        
        let parsedVal: any = val;
        if (field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fat') {
          parsedVal = val === '' ? 0 : parseFloat(val);
          if (isNaN(parsedVal)) parsedVal = 0;
        }

        return { ...item, [field]: parsedVal };
      })
    );
  };

  const handleAddItem = () => {
    const newItem: MealItem = {
      id: `item-${Date.now()}`,
      name: 'Novo Alimento',
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2,
      amount: '100g',
    };
    setItems([...items, newItem]);
  };

  const handleDeleteItem = (itemId: string) => {
    if (items.length <= 1) {
      Alert.alert('Erro', 'A refeição deve ter pelo menos um ingrediente.');
      return;
    }
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome da refeição não pode estar em branco.');
      return;
    }

    const updatedMealData = {
      name,
      type,
      portions,
      calories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
      protein: items.reduce((sum, item) => sum + (item.protein || 0), 0),
      carbs: items.reduce((sum, item) => sum + (item.carbs || 0), 0),
      fat: items.reduce((sum, item) => sum + (item.fat || 0), 0),
      emoji: mealId ? (state.meals.find(m => m.id === mealId)?.emoji || '🍽️') : (foodName ? mockScannerScan(foodName as string).emoji : '✏️'),
      confidence: mealId ? (state.meals.find(m => m.id === mealId)?.confidence || 100) : (foodName ? mockScannerScan(foodName as string).confidence : 100),
      items,
    };

    if (mealId) {
      // Update existing logged meal
      updateMeal({
        ...updatedMealData,
        id: mealId as string,
        time: state.meals.find(m => m.id === mealId)?.time || '00:00',
      });
      Alert.alert('Sucesso', 'Refeição atualizada!');
    } else {
      // Add new meal
      addMeal(updatedMealData);
      Alert.alert('Sucesso', 'Refeição registrada com sucesso!');
    }

    router.dismissAll();
    router.replace('/(tabs)');
  };

  const handleDeleteMeal = () => {
    if (!mealId) return;
    
    Alert.alert(
      'Excluir refeição',
      'Tem certeza que deseja remover esta refeição do seu histórico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            deleteMeal(mealId as string);
            router.dismissAll();
            router.replace('/(tabs)');
          }
        }
      ]
    );
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.dismiss()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>
          {mealId ? 'Editar Refeição' : 'Ajustar Refeição'}
        </Text>
        {mealId ? (
          <Pressable onPress={handleDeleteMeal} style={styles.deleteHeaderBtn}>
            <Ionicons name="trash-outline" size={20} color={globalColors.danger} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
          {/* General Details */}
          <Card style={styles.sectionCard}>
            <Input
              label="Nome da Refeição"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Salada de Frango"
            />

            <View style={styles.rowFields}>
              <View style={styles.colField}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Tipo</Text>
                <View style={[styles.selectorContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  {/* Since standard picker might need external packages, let's build an interactive toggle */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeToggleScroll}>
                    {['Café da manhã', 'Almoço', 'Jantar', 'Lanche'].map((t) => {
                      const active = type === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setType(t as MealType)}
                          style={[
                            styles.typeChip,
                            active && { backgroundColor: globalColors.primary },
                          ]}
                        >
                          <Text style={[styles.typeChipText, active ? { color: '#FFF' } : { color: colors.textMuted }]}>
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <View style={[styles.colField, { flex: 0.4 }]}>
                <Input
                  label="Porções"
                  value={portions.toString()}
                  onChangeText={(val) => {
                    const parsed = parseFloat(val);
                    setPortions(isNaN(parsed) ? 1 : parsed);
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
            </View>
          </Card>

          {/* Editable Ingredients List */}
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Ingredientes</Text>

          {items.map((item) => (
            <Card key={item.id} style={[styles.ingredientCard, { borderColor: colors.borderColor }]}>
              <View style={styles.ingredientHeaderRow}>
                <TextInput
                  style={[styles.ingredientNameInput, { color: colors.textMain, borderBottomColor: colors.inputBorder }]}
                  value={item.name}
                  onChangeText={(val) => handleUpdateItem(item.id, 'name', val)}
                  placeholder="Nome do alimento"
                />
                <Pressable onPress={() => handleDeleteItem(item.id)} style={styles.deleteItemBtn}>
                  <Ionicons name="trash-outline" size={16} color={globalColors.danger} />
                </Pressable>
              </View>

              <View style={styles.ingredientNutrientRow}>
                <View style={styles.nutrientInputWrapper}>
                  <Text style={[styles.nutrientLabel, { color: colors.textLight }]}>Qtd</Text>
                  <TextInput
                    style={[styles.nutrientInput, { color: colors.textMain, backgroundColor: colors.inputBg }]}
                    value={item.amount}
                    onChangeText={(val) => handleUpdateItem(item.id, 'amount', val)}
                    placeholder="150g"
                  />
                </View>

                <View style={styles.nutrientInputWrapper}>
                  <Text style={[styles.nutrientLabel, { color: colors.textLight }]}>kcal</Text>
                  <TextInput
                    style={[styles.nutrientInput, { color: colors.textMain, backgroundColor: colors.inputBg }]}
                    value={item.calories.toString()}
                    onChangeText={(val) => handleUpdateItem(item.id, 'calories', val)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.nutrientInputWrapper}>
                  <Text style={[styles.nutrientLabel, { color: colors.textLight }]}>Prot(g)</Text>
                  <TextInput
                    style={[styles.nutrientInput, { color: colors.textMain, backgroundColor: colors.inputBg }]}
                    value={item.protein.toString()}
                    onChangeText={(val) => handleUpdateItem(item.id, 'protein', val)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.nutrientInputWrapper}>
                  <Text style={[styles.nutrientLabel, { color: colors.textLight }]}>Carb(g)</Text>
                  <TextInput
                    style={[styles.nutrientInput, { color: colors.textMain, backgroundColor: colors.inputBg }]}
                    value={item.carbs.toString()}
                    onChangeText={(val) => handleUpdateItem(item.id, 'carbs', val)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.nutrientInputWrapper}>
                  <Text style={[styles.nutrientLabel, { color: colors.textLight }]}>Gord(g)</Text>
                  <TextInput
                    style={[styles.nutrientInput, { color: colors.textMain, backgroundColor: colors.inputBg }]}
                    value={item.fat.toString()}
                    onChangeText={(val) => handleUpdateItem(item.id, 'fat', val)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Card>
          ))}

          {/* Add Ingredient button */}
          <Pressable 
            onPress={handleAddItem}
            style={[styles.addBtn, { borderColor: globalColors.primary }]}
          >
            <Ionicons name="add" size={18} color={globalColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.addBtnText, { color: globalColors.primary }]}>Adicionar alimento</Text>
          </Pressable>

          {/* Aggregated Totals Card */}
          <Card style={styles.totalsCard}>
            <Text style={[styles.totalsHeader, { color: colors.textLight }]}>Total Estimado</Text>
            <View style={styles.totalsGrid}>
              <View style={styles.totalBox}>
                <Text style={[styles.totalVal, { color: colors.textMain }]}>{totals.calories}</Text>
                <Text style={[styles.totalLbl, { color: colors.textLight }]}>kcal</Text>
              </View>
              <View style={styles.totalBox}>
                <Text style={[styles.totalVal, { color: globalColors.protein }]}>{totals.protein}g</Text>
                <Text style={[styles.totalLbl, { color: colors.textLight }]}>prot</Text>
              </View>
              <View style={styles.totalBox}>
                <Text style={[styles.totalVal, { color: globalColors.carbs }]}>{totals.carbs}g</Text>
                <Text style={[styles.totalLbl, { color: colors.textLight }]}>carbo</Text>
              </View>
              <View style={styles.totalBox}>
                <Text style={[styles.totalVal, { color: globalColors.fat }]}>{totals.fat}g</Text>
                <Text style={[styles.totalLbl, { color: colors.textLight }]}>gordura</Text>
              </View>
            </View>
          </Card>

          {/* Save Button */}
          <Button
            title="Confirmar alterações"
            onPress={handleSave}
            variant="primary"
            style={styles.saveBtn}
          />
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
        paddingTop: 44,
      },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  deleteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 16,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  colField: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  selectorContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    height: 52,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  typeToggleScroll: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginRight: 6,
    alignSelf: 'center',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom: 12,
  },
  ingredientCard: {
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  ingredientHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    borderBottomWidth: 1,
    paddingVertical: 4,
    marginRight: 10,
  },
  deleteItemBtn: {
    padding: 6,
  },
  ingredientNutrientRow: {
    flexDirection: 'row',
    gap: 6,
  },
  nutrientInputWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  nutrientInput: {
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalsCard: {
    padding: 16,
    marginVertical: 12,
  },
  totalsHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    marginBottom: 12,
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  totalBox: {
    flex: 1,
    alignItems: 'center',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  totalLbl: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    marginVertical: 12,
    height: 54,
  },
  bottomSpacer: {
    height: 60,
  },
});
