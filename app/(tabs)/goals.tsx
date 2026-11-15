import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseScreen, Button, Card, ProgressBar } from '../../src/components';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import { type } from '../../src/theme/type';
import { layout } from '../../src/theme/layout';

const objectiveLabels = { lose: 'Perder peso', maintain: 'Manter peso', gain: 'Ganhar peso' } as const;
const activityLabels = { sedentary: 'sedentário', light: 'leve', moderate: 'moderado', active: 'ativo', very_active: 'muito ativo' } as const;

export default function GoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, globalColors } = useTheme();
  const { state, updateProfile } = useAppState();
  const { profile, goals, meals, waterIntake } = state;
  const [motivation, setMotivation] = useState(profile.motivation || '');
  const [editingMotivation, setEditingMotivation] = useState(!profile.motivation);
  const [saving, setSaving] = useState(false);

  const todayTotals = useMemo(() => {
    const now = new Date();
    return meals.reduce((total, meal) => {
      const date = meal.consumedAt ? new Date(meal.consumedAt) : null;
      if (!date || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth() || date.getDate() !== now.getDate()) return total;
      total.meals += 1;
      total.protein += meal.protein * meal.portions;
      return total;
    }, { meals: 0, protein: 0 });
  }, [meals]);

  const proteinProgress = goals.protein > 0 ? Math.min(1, todayTotals.protein / goals.protein) : 0;
  const waterProgress = goals.water > 0 ? Math.min(1, waterIntake / goals.water) : 0;

  // Participação real de cada macro nas calorias da meta (4/4/9 kcal por grama).
  const macroKcal = { protein: goals.protein * 4, carbs: goals.carbs * 4, fat: goals.fat * 9 };
  const macroTotal = Math.max(1, macroKcal.protein + macroKcal.carbs + macroKcal.fat);
  const macros = [
    { label: 'Proteína', grams: goals.protein, share: macroKcal.protein / macroTotal, color: globalColors.protein },
    { label: 'Carboidrato', grams: goals.carbs, share: macroKcal.carbs / macroTotal, color: globalColors.carbs },
    { label: 'Gordura', grams: goals.fat, share: macroKcal.fat / macroTotal, color: globalColors.fat },
  ];

  const tasks = [
    { title: 'Registrar uma refeição', detail: `${todayTotals.meals} ${todayTotals.meals === 1 ? 'registro' : 'registros'} hoje`, progress: todayTotals.meals > 0 ? 1 : 0 },
    { title: 'Beber a água do dia', detail: `${(waterIntake / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de ${(goals.water / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`, progress: waterProgress },
    { title: 'Bater a proteína', detail: `${Math.round(todayTotals.protein)} de ${goals.protein} g`, progress: proteinProgress },
  ];

  const saveMotivation = async () => {
    setSaving(true);
    try {
      await updateProfile({ motivation: motivation.trim() });
      setEditingMotivation(false);
    } catch (reason) {
      Alert.alert('Não foi possível salvar', reason instanceof Error ? reason.message : 'Tente novamente.');
    } finally { setSaving(false); }
  };

  const plan = [
    profile.activityLevel ? `nível de atividade ${activityLabels[profile.activityLevel]}` : null,
    profile.weight ? `${profile.weight} kg` : null,
  ].filter(Boolean).join(' · ');

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={[type.title, styles.flex, { color: colors.textMain }]} accessibilityRole="header">Metas</Text>
          <Pressable onPress={() => router.push('/sub-screens/edit-profile')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Ajustar perfil e metas">
            <Ionicons name="options-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Objetivo e meta de energia: o número é o destaque, sem faixa colorida. */}
        <View style={styles.hero}>
          <Text style={[type.caption, { color: colors.textMuted }]}>{profile.objective ? objectiveLabels[profile.objective] : 'Plano personalizado'}</Text>
          <View style={styles.heroValue}>
            <Text style={[type.display, { color: colors.textMain }]}>{goals.calories.toLocaleString('pt-BR')}</Text>
            <Text style={[type.body, { color: colors.textMuted }]}>kcal por dia</Text>
          </View>
          {plan ? <Text style={[type.caption, { color: colors.textMuted }]}>Calculado para {plan}</Text> : null}
        </View>

        <Card style={styles.list}>
          {macros.map((macro, index) => (
            <View key={macro.label} style={[styles.macroRow, index > 0 && { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth * 2 }]}>
              <View style={styles.rowHeader}>
                <Text style={[type.body, styles.flex, { color: colors.textMain }]}>{macro.label}</Text>
                <Text style={[type.body, type.strong, type.number, { color: colors.textMain }]}>{Math.round(macro.grams)} g</Text>
                <Text style={[type.caption, type.number, styles.share, { color: colors.textMuted }]}>{Math.round(macro.share * 100)}%</Text>
              </View>
              <ProgressBar progress={macro.share} color={macro.color} trackColor={colors.track} height={4} />
            </View>
          ))}
          <View style={[styles.waterRow, { borderTopColor: colors.hairline }]}>
            <Text style={[type.body, styles.flex, { color: colors.textMain }]}>Água</Text>
            <Text style={[type.body, type.strong, type.number, { color: colors.textMain }]}>
              {(goals.water / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
            </Text>
          </View>
        </Card>

        <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]} accessibilityRole="header">Hoje</Text>
        <Card style={styles.list}>
          {tasks.map((task, index) => {
            const done = task.progress >= 1;
            return (
              <View key={task.title} style={[styles.taskRow, index > 0 && { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth * 2 }]}>
                <View style={[styles.check, { borderColor: done ? globalColors.action : colors.inputBorder, backgroundColor: done ? globalColors.action : 'transparent' }]}>
                  {done ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={[type.body, { color: colors.textMain }]}>{task.title}</Text>
                  <Text style={[type.caption, type.number, { color: colors.textMuted }]}>{task.detail}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]} accessibilityRole="header">Seu motivo</Text>
        <Card style={styles.motivationCard}>
          {editingMotivation ? (
            <>
              <TextInput
                value={motivation}
                onChangeText={setMotivation}
                maxLength={300}
                multiline
                textAlignVertical="top"
                placeholder="O que fez você começar? Isso aparece no Início nos dias difíceis."
                placeholderTextColor={colors.textLight}
                style={[type.body, styles.motivationInput, { color: colors.textMain, borderColor: colors.inputBorder }]}
                accessibilityLabel="Seu motivo"
              />
              <View style={styles.motivationFooter}>
                <Text style={[type.caption, type.number, styles.flex, { color: colors.textLight }]}>{motivation.length}/300</Text>
                <Button title="Salvar" onPress={saveMotivation} loading={saving} disabled={!motivation.trim()} style={styles.saveButton} />
              </View>
            </>
          ) : (
            <Pressable onPress={() => setEditingMotivation(true)} style={styles.motivationSaved} accessibilityRole="button" accessibilityHint="Editar seu motivo">
              <Text style={[type.body, styles.flex, { color: colors.textMain }]}>{motivation}</Text>
              <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </Card>

        <Card style={styles.linkRow} onPress={() => router.push('/sub-screens/visual-progress' as never)}>
          <Ionicons name="images-outline" size={22} color={colors.textMuted} />
          <View style={styles.flex}>
            <Text style={[type.body, { color: colors.textMain }]}>Fotos de evolução</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>Privadas. Compare antes e depois.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </Card>

        <Text style={[type.caption, styles.disclaimer, { color: colors.textLight }]}>
          As metas são estimativas gerais e não substituem acompanhamento médico ou nutricional.
        </Text>
        <View style={{ height: layout.tabBarHeight + Math.max(insets.bottom, 8) + 24 }} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 4 },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  list: { paddingHorizontal: 16 },
  macroRow: { paddingVertical: 12, gap: 8 },
  rowHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  share: { width: 40, textAlign: 'right' },
  waterRow: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  sectionLabel: { marginTop: 8, marginBottom: -8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  motivationCard: { padding: 16 },
  motivationInput: { minHeight: 96, borderWidth: 1, borderRadius: 12, padding: 12 },
  motivationFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  saveButton: { width: 120, height: 48 },
  motivationSaved: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 48 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 72 },
  disclaimer: { paddingHorizontal: 4 },
});
