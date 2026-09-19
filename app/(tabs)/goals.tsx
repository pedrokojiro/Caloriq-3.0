import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Card, Input, Button } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function GoalsScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { state, updateGoals, updateProfile } = useAppState();

  const [weight, setWeight] = useState(state.profile.weight.toString());
  const [calories, setCalories] = useState(state.goals.calories.toString());
  const [protein, setProtein] = useState(state.goals.protein.toString());
  const [carbs, setCarbs] = useState(state.goals.carbs.toString());
  const [fat, setFat] = useState(state.goals.fat.toString());
  const [water, setWater] = useState(state.goals.water.toString());
  const handleSave = () => {
    const numWeight = parseFloat(weight);
    const numCalories = parseInt(calories);
    const numProtein = parseInt(protein);
    const numCarbs = parseInt(carbs);
    const numFat = parseInt(fat);
    const numWater = parseInt(water);

    if (
      isNaN(numWeight) ||
      isNaN(numCalories) ||
      isNaN(numProtein) ||
      isNaN(numCarbs) ||
      isNaN(numFat) ||
      isNaN(numWater)
    ) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos com valores válidos.');
      return;
    }

    // Save to global context
    updateProfile({ weight: numWeight });
    updateGoals({
      calories: numCalories,
      protein: numProtein,
      carbs: numCarbs,
      fat: numFat,
      water: numWater,
    });

    Alert.alert('Sucesso', 'Metas atualizadas com sucesso!');
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Definir Metas</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>Ajuste seus objetivos diários</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
        {/* Personal Target Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#EDFBF3' }]}>
              <Ionicons name="scale-outline" size={20} color={globalColors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Peso Corporal</Text>
          </View>
          <Input
            label="Peso Atual (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="Ex: 75"
            keyboardType="numeric"
          />
        </Card>

        {/* Daily Energy Targets */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="flame-outline" size={20} color={globalColors.protein} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Energia & Hidratação</Text>
          </View>
          
          <Input
            label="Meta Calórica Diária (kcal)"
            value={calories}
            onChangeText={setCalories}
            placeholder="Ex: 2000"
            keyboardType="numeric"
          />

          <Input
            label="Meta de Hidratação Diária (ml)"
            value={water}
            onChangeText={setWater}
            placeholder="Ex: 2500"
            keyboardType="numeric"
          />
        </Card>

        {/* Macronutrients Targets */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="pie-chart-outline" size={20} color={globalColors.carbs} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Macronutrientes (Gramas)</Text>
          </View>

          <Input
            label="Proteína (g)"
            value={protein}
            onChangeText={setProtein}
            placeholder="Ex: 150"
            keyboardType="numeric"
            inputStyle={{ color: globalColors.protein, fontWeight: '700' }}
          />

          <Input
            label="Carboidrato (g)"
            value={carbs}
            onChangeText={setCarbs}
            placeholder="Ex: 200"
            keyboardType="numeric"
            inputStyle={{ color: globalColors.carbs, fontWeight: '700' }}
          />

          <Input
            label="Gordura (g)"
            value={fat}
            onChangeText={setFat}
            placeholder="Ex: 65"
            keyboardType="numeric"
            inputStyle={{ color: globalColors.fat, fontWeight: '700' }}
          />
        </Card>

        {/* Save CTA */}
        <Button
          title="Recalcular pelo meu perfil"
          onPress={() => router.push('/(auth)/profile-setup' as never)}
          variant="outline"
          style={styles.recalculateBtn}
          icon={<Ionicons name="calculator-outline" size={18} color={globalColors.primary} />}
        />
        <Button
          title="Salvar Alterações"
          onPress={handleSave}
          variant="primary"
          style={styles.saveBtn}
        />

        <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  keyboardArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    width: '100%',
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
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  saveBtn: {
    marginTop: 10,
    height: 54,
  },
  recalculateBtn: {
    marginTop: 10,
    height: 52,
  },
  bottomSpacer: {
    height: 100,
  },
});
