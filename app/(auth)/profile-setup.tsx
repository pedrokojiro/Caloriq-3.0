import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Button, Input } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import {
  calculateNutritionTargets,
  type ActivityLevel,
  type CalculationSex,
  type NutritionObjective,
  type NutritionProfileInput,
} from '../../src/utils/nutrition';

const activityOptions: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentário', description: 'Pouco ou nenhum exercício' },
  { value: 'light', label: 'Leve', description: 'Exercício 1–3 dias/semana' },
  { value: 'moderate', label: 'Moderado', description: 'Exercício 3–5 dias/semana' },
  { value: 'active', label: 'Ativo', description: 'Exercício 6–7 dias/semana' },
  { value: 'very_active', label: 'Muito ativo', description: 'Treino intenso ou trabalho físico' },
];

const objectiveOptions: { value: NutritionObjective; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose', label: 'Perder peso', icon: 'trending-down-outline' },
  { value: 'maintain', label: 'Manter peso', icon: 'remove-outline' },
  { value: 'gain', label: 'Ganhar peso', icon: 'trending-up-outline' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, completeOnboarding } = useAuth();
  const { state } = useAppState();
  const { globalColors } = useTheme();
  const savedProfile = user?.onboardingCompleted ? state.profile : undefined;
  const [sex, setSex] = useState<CalculationSex | null>(() => savedProfile?.calculationSex || null);
  const [age, setAge] = useState(() => savedProfile?.age?.toString() || '');
  const [height, setHeight] = useState(() => savedProfile?.heightCm?.toString() || '');
  const [weight, setWeight] = useState(() => savedProfile?.weight?.toString() || '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(() => savedProfile?.activityLevel || 'moderate');
  const [objective, setObjective] = useState<NutritionObjective>(() => savedProfile?.objective || 'maintain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(() => ({
    age: Number(age),
    heightCm: Number(height.replace(',', '.')),
    weight: Number(weight.replace(',', '.')),
  }), [age, height, weight]);

  const isValid = Boolean(
    sex && Number.isInteger(parsed.age) && parsed.age >= 18 && parsed.age <= 100
    && parsed.heightCm >= 120 && parsed.heightCm <= 230
    && parsed.weight >= 30 && parsed.weight <= 350
  );

  const preview = useMemo(() => {
    if (!sex || !isValid) return null;
    return calculateNutritionTargets({ sex, ...parsed, activityLevel, objective });
  }, [activityLevel, isValid, objective, parsed, sex]);

  if (!user) return <Redirect href="/(auth)/login" />;

  const save = async () => {
    if (!sex || !isValid) {
      setError('Revise os dados. Idade: 18–100, altura: 120–230 cm e peso: 30–350 kg.');
      return;
    }
    const profile: NutritionProfileInput = { sex, ...parsed, activityLevel, objective };
    setError('');
    setLoading(true);
    try {
      await completeOnboarding(profile);
      router.replace('/(tabs)');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar suas metas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseScreen scrollable style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        {user.onboardingCompleted ? (
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#0D1117" />
          </Pressable>
        ) : <View style={styles.backButtonPlaceholder} />}
        <View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: globalColors.primary }]} /></View>
        <Text style={styles.step}>2 de 2</Text>
      </View>

      <Text style={styles.eyebrow}>{user.onboardingCompleted ? 'RECALCULAR METAS' : 'SEU PERFIL'}</Text>
      <Text style={styles.title}>Metas que combinam com você</Text>
      <Text style={styles.subtitle}>Usamos seus dados para estimar a TMB e transformar isso em objetivos diários editáveis.</Text>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.iconBox}><Ionicons name="person-outline" size={20} color={globalColors.primary} /></View>
          <Text style={styles.cardTitle}>Dados corporais</Text>
        </View>
        <Text style={styles.fieldLabel}>Sexo usado no cálculo metabólico</Text>
        <View style={styles.twoColumns}>
          <ChoiceChip label="Feminino" selected={sex === 'female'} onPress={() => setSex('female')} />
          <ChoiceChip label="Masculino" selected={sex === 'male'} onPress={() => setSex('male')} />
        </View>
        <Text style={styles.helper}>A fórmula usa constantes diferentes para cada opção.</Text>
        <View style={styles.inputRow}>
          <Input label="Idade" value={age} onChangeText={setAge} placeholder="Ex.: 24" keyboardType="number-pad" style={styles.flexInput} />
          <Input label="Altura (cm)" value={height} onChangeText={setHeight} placeholder="Ex.: 175" keyboardType="decimal-pad" style={styles.flexInput} />
        </View>
        <Input label="Peso atual (kg)" value={weight} onChangeText={setWeight} placeholder="Ex.: 78" keyboardType="decimal-pad" />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.iconBox}><Ionicons name="fitness-outline" size={20} color={globalColors.primary} /></View>
          <Text style={styles.cardTitle}>Rotina e objetivo</Text>
        </View>
        <Text style={styles.fieldLabel}>Nível de atividade</Text>
        {activityOptions.map(option => (
          <Pressable key={option.value} onPress={() => setActivityLevel(option.value)} style={[styles.optionRow, activityLevel === option.value && styles.optionRowSelected]}>
            <View style={[styles.radio, activityLevel === option.value && { borderColor: globalColors.primary }]}>
              {activityLevel === option.value ? <View style={[styles.radioDot, { backgroundColor: globalColors.primary }]} /> : null}
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
          </Pressable>
        ))}
        <Text style={[styles.fieldLabel, styles.objectiveLabel]}>Seu objetivo</Text>
        <View style={styles.objectiveRow}>
          {objectiveOptions.map(option => (
            <Pressable key={option.value} onPress={() => setObjective(option.value)} style={[styles.objectiveCard, objective === option.value && styles.objectiveCardSelected]}>
              <Ionicons name={option.icon} size={22} color={objective === option.value ? globalColors.primary : '#7B8492'} />
              <Text style={[styles.objectiveText, objective === option.value && { color: globalColors.primary }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {preview ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.resultEyebrow}>SUA ESTIMATIVA DIÁRIA</Text>
              <Text style={styles.calorieValue}>{preview.calories.toLocaleString('pt-BR')} <Text style={styles.calorieUnit}>kcal</Text></Text>
            </View>
            <View style={styles.targetIcon}><Ionicons name="sparkles" size={23} color="#FFF" /></View>
          </View>
          <View style={styles.metricsRow}>
            <Metric label="TMB" value={`${preview.bmr} kcal`} />
            <Metric label="Gasto diário" value={`${preview.dailyExpenditure} kcal`} />
            <Metric label="Água" value={`${preview.water} ml`} />
          </View>
          <View style={styles.macrosRow}>
            <Macro color="#FF7A35" label="Proteína" value={`${preview.protein}g`} />
            <Macro color="#2563EB" label="Carbo" value={`${preview.carbs}g`} />
            <Macro color="#F59E0B" label="Gordura" value={`${preview.fat}g`} />
          </View>
        </View>
      ) : (
        <View style={styles.emptyPreview}><Ionicons name="calculator-outline" size={22} color="#9AA3B0" /><Text style={styles.emptyText}>Preencha seus dados para visualizar as metas.</Text></View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={user.onboardingCompleted ? 'Recalcular e salvar' : 'Criar minhas metas'} onPress={save} loading={loading} disabled={!isValid} style={styles.saveButton} />
      <Text style={styles.disclaimer}>Essas metas são estimativas para acompanhamento geral e não substituem orientação de nutricionista ou médico.</Text>
    </BaseScreen>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choiceChip, selected && styles.choiceChipSelected]}><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={selected ? '#1AAF5D' : '#9AA3B0'} /><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Macro({ color, label, value }: { color: string; label: string; value: string }) {
  return <View style={styles.macro}><View style={[styles.macroDot, { backgroundColor: color }]} /><View><Text style={styles.macroValue}>{value}</Text><Text style={styles.macroLabel}>{label}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F9F8' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 42, flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8EAEE', alignItems: 'center', justifyContent: 'center' },
  backButtonPlaceholder: { width: 42 },
  progressTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#E2E7E4', overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', borderRadius: 4 },
  step: { fontSize: 12, fontWeight: '800', color: '#7B8492' },
  eyebrow: { color: '#1AAF5D', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
  title: { color: '#0D1117', fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -0.9, marginBottom: 9 },
  subtitle: { color: '#6B7585', fontSize: 14, lineHeight: 21, marginBottom: 22 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E9E7', borderRadius: 24, padding: 18, marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EDFBF3', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '900', color: '#18201B' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#5E6875', marginBottom: 8 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  choiceChip: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E7E4', backgroundColor: '#F8FAF9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  choiceChipSelected: { borderColor: '#1AAF5D', backgroundColor: '#EDFBF3' },
  choiceText: { fontSize: 14, fontWeight: '700', color: '#65706B' },
  choiceTextSelected: { color: '#158F4C' },
  helper: { fontSize: 11, color: '#98A09C', marginTop: 7, marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 10 },
  flexInput: { flex: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7, backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: '#EEF1EF' },
  optionRowSelected: { backgroundColor: '#F0FBF5', borderColor: '#AEE7C8' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C8CECB', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 13, fontWeight: '800', color: '#27302B' },
  optionDescription: { fontSize: 11, color: '#7B8492', marginTop: 2 },
  objectiveLabel: { marginTop: 13 },
  objectiveRow: { flexDirection: 'row', gap: 7 },
  objectiveCard: { flex: 1, minHeight: 77, paddingHorizontal: 5, borderRadius: 14, borderWidth: 1, borderColor: '#E2E7E4', alignItems: 'center', justifyContent: 'center', gap: 6 },
  objectiveCardSelected: { backgroundColor: '#EDFBF3', borderColor: '#1AAF5D' },
  objectiveText: { color: '#65706B', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  resultCard: { backgroundColor: '#10261A', borderRadius: 24, padding: 19, marginBottom: 14 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: '#8FD7AE' },
  calorieValue: { fontSize: 30, fontWeight: '900', color: '#FFF', marginTop: 4 },
  calorieUnit: { fontSize: 14, fontWeight: '700', color: '#B7C9BE' },
  targetIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1AAF5D', alignItems: 'center', justifyContent: 'center' },
  metricsRow: { flexDirection: 'row', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#294033' },
  metric: { flex: 1 },
  metricLabel: { color: '#8EA398', fontSize: 10, marginBottom: 3 },
  metricValue: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  macrosRow: { flexDirection: 'row', marginTop: 16, gap: 7 },
  macro: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#1A3224', borderRadius: 12, padding: 9 },
  macroDot: { width: 7, height: 7, borderRadius: 4 },
  macroValue: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  macroLabel: { color: '#8EA398', fontSize: 9, marginTop: 1 },
  emptyPreview: { minHeight: 74, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CCD3CF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 14 },
  emptyText: { color: '#7B8492', fontSize: 12 },
  error: { color: '#D92D20', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  saveButton: { height: 57 },
  disclaimer: { fontSize: 10, lineHeight: 15, textAlign: 'center', color: '#8B9490', marginTop: 12, paddingHorizontal: 12 },
});
