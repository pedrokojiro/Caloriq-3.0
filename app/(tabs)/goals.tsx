import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseScreen, Card, ProgressBar } from '../../src/components';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';

const objectiveLabels = { lose: 'Perder peso', maintain: 'Manter peso', gain: 'Ganhar peso' } as const;
const activityLabels = { sedentary: 'Sedentário', light: 'Leve', moderate: 'Moderado', active: 'Ativo', very_active: 'Muito ativo' } as const;

export default function GoalsScreen() {
  const router = useRouter();
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
      total.calories += meal.calories * meal.portions;
      total.protein += meal.protein * meal.portions;
      return total;
    }, { meals: 0, calories: 0, protein: 0 });
  }, [meals]);

  const proteinProgress = goals.protein > 0 ? Math.min(1, todayTotals.protein / goals.protein) : 0;
  const waterProgress = goals.water > 0 ? Math.min(1, waterIntake / goals.water) : 0;

  const saveMotivation = async () => {
    setSaving(true);
    try {
      await updateProfile({ motivation: motivation.trim() });
      setEditingMotivation(false);
      Alert.alert('Motivação salva', 'Seu porquê agora aparecerá na tela inicial.');
    } catch (reason) {
      Alert.alert('Não foi possível salvar', reason instanceof Error ? reason.message : 'Tente novamente.');
    } finally { setSaving(false); }
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <View><Text style={[styles.headerTitle, { color: colors.textMain }]}>Meu Plano</Text><Text style={[styles.headerSubtitle, { color: colors.textLight }]}>Nutrição, execução e propósito</Text></View>
        <Pressable onPress={() => router.push('/sub-screens/edit-profile')} style={[styles.editButton, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="options-outline" size={20} color={globalColors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.bgApp }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#22C566', '#159A52', '#0E6E3D']} style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.heroBadge}><Ionicons name="flag" size={14} color="#FFF" /><Text style={styles.heroBadgeText}>OBJETIVO ATUAL</Text></View><Ionicons name="sparkles" size={23} color="rgba(255,255,255,0.75)" /></View>
          <Text style={styles.heroTitle}>{profile.objective ? objectiveLabels[profile.objective] : 'Plano personalizado'}</Text>
          <Text style={styles.heroDescription}>Seu plano combina dados nutricionais com ações consistentes para aproximar você do seu objetivo.</Text>
          <View style={styles.heroMeta}>
            <Meta icon="flame-outline" text={`${goals.calories.toLocaleString('pt-BR')} kcal`} />
            <Meta icon="fitness-outline" text={profile.activityLevel ? activityLabels[profile.activityLevel] : 'Perfil atual'} />
          </View>
        </LinearGradient>

        <SectionTitle title="Metas diárias" subtitle="Resumo calculado pelo seu perfil" action="Atualizar perfil" onPress={() => router.push('/sub-screens/edit-profile')} />
        <View style={styles.goalGrid}>
          <GoalCard icon="flame" value={goals.calories.toLocaleString('pt-BR')} unit="kcal" label="Energia" color="#FF7A35" bg="#FFF3EC" />
          <GoalCard icon="water" value={(goals.water / 1000).toFixed(1)} unit="L" label="Hidratação" color="#3B82F6" bg="#EEF4FF" />
        </View>
        <Card style={styles.macrosCard}>
          <Text style={[styles.cardTitle, { color: colors.textMain }]}>Distribuição de macronutrientes</Text>
          <MacroRow label="Proteína" value={`${goals.protein}g`} share="25%" color={globalColors.protein} progress={0.25} />
          <MacroRow label="Carboidrato" value={`${goals.carbs}g`} share="45%" color={globalColors.carbs} progress={0.45} />
          <MacroRow label="Gordura" value={`${goals.fat}g`} share="30%" color={globalColors.fat} progress={0.3} />
        </Card>

        <SectionTitle title="Execução de hoje" subtitle="O plano acontece nas pequenas ações" />
        <Card style={styles.executionCard}>
          <ExecutionItem icon="restaurant-outline" title="Registrar uma refeição" detail={`${todayTotals.meals} registro${todayTotals.meals === 1 ? '' : 's'} hoje`} progress={todayTotals.meals > 0 ? 1 : 0} done={todayTotals.meals > 0} />
          <ExecutionItem icon="water-outline" title="Atingir a hidratação" detail={`${(waterIntake / 1000).toFixed(1)} de ${(goals.water / 1000).toFixed(1)} L`} progress={waterProgress} done={waterProgress >= 1} />
          <ExecutionItem icon="barbell-outline" title="Cumprir a proteína" detail={`${Math.round(todayTotals.protein)} de ${goals.protein} g`} progress={proteinProgress} done={proteinProgress >= 1} last />
        </Card>

        <Card style={styles.commitmentCard}>
          <View style={styles.commitmentTitleRow}><View style={[styles.commitmentIcon, { backgroundColor: `${globalColors.primary}16` }]}><Ionicons name="heart-outline" size={19} color={globalColors.primary} /></View><View style={styles.commitmentTitleCopy}><Text style={[styles.cardTitleCompact, { color: colors.textMain }]}>Meu porquê</Text><Text style={[styles.commitmentHintCompact, { color: colors.textLight }]}>Uma lembrança pessoal para os dias difíceis.</Text></View><Pressable onPress={() => setEditingMotivation(value => !value)} style={styles.commitmentEdit}><Ionicons name={editingMotivation ? 'close' : 'pencil-outline'} size={18} color={globalColors.primary} /></Pressable></View>
          {editingMotivation ? <>
            <TextInput value={motivation} onChangeText={setMotivation} maxLength={300} multiline textAlignVertical="top"
              placeholder="O que fez você começar?" placeholderTextColor={colors.textLight}
              style={[styles.motivationInputCompact, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} />
            <View style={styles.commitmentFooter}><Text style={[styles.characterCount, { color: colors.textLight }]}>{motivation.length}/300</Text><Pressable disabled={saving} onPress={saveMotivation} style={[styles.saveMotivation, { backgroundColor: globalColors.primary }, saving && { opacity: 0.6 }]}><Text style={styles.saveMotivationText}>{saving ? 'Salvando...' : 'Salvar'}</Text></Pressable></View>
          </> : <Text style={[styles.savedMotivation, { color: colors.textMain }]}>{motivation || 'Toque no lápis para registrar sua motivação.'}</Text>}
        </Card>

        <SectionTitle title="Minha evolução" subtitle="Registre mudanças que os números não mostram" />
        <Pressable onPress={() => router.push('/sub-screens/visual-progress' as never)} style={({ pressed }) => [styles.visualProgress, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }, pressed && styles.pressed]}>
          <LinearGradient colors={['#E9FAF0', '#DDF5E7']} style={styles.visualIcon}><Ionicons name="images-outline" size={27} color="#159A52" /></LinearGradient>
          <View style={styles.visualCopy}><Text style={[styles.visualTitle, { color: colors.textMain }]}>Evolução visual</Text><Text style={[styles.visualDescription, { color: colors.textLight }]}>Fotos privadas, linha do tempo e comparação antes/depois.</Text></View>
          <Ionicons name="chevron-forward" size={21} color={colors.textLight} />
        </Pressable>

        <View style={[styles.disclaimer, { backgroundColor: colors.inputBg }]}><Ionicons name="information-circle-outline" size={18} color={colors.textLight} /><Text style={[styles.disclaimerText, { color: colors.textLight }]}>As metas são estimativas gerais e não substituem acompanhamento médico ou nutricional.</Text></View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </BaseScreen>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={styles.meta}><Ionicons name={icon} size={15} color="#FFF" /><Text style={styles.metaText}>{text}</Text></View>; }

function SectionTitle({ title, subtitle, action, onPress }: { title: string; subtitle: string; action?: string; onPress?: () => void }) {
  const { colors, globalColors } = useTheme();
  return <View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text style={[styles.sectionTitle, { color: colors.textMain }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>{subtitle}</Text></View>{action ? <Pressable onPress={onPress}><Text style={[styles.sectionAction, { color: globalColors.primary }]}>{action}</Text></Pressable> : null}</View>;
}

function GoalCard({ icon, value, unit, label, color, bg }: { icon: keyof typeof Ionicons.glyphMap; value: string; unit: string; label: string; color: string; bg: string }) {
  const { colors } = useTheme();
  return <Card style={styles.goalCard}><View style={[styles.goalIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={color} /></View><Text style={[styles.goalValue, { color: colors.textMain }]}>{value} <Text style={[styles.goalUnit, { color: colors.textLight }]}>{unit}</Text></Text><Text style={[styles.goalLabel, { color: colors.textMuted }]}>{label}</Text></Card>;
}

function MacroRow({ label, value, share, color, progress }: { label: string; value: string; share: string; color: string; progress: number }) {
  const { colors } = useTheme();
  return <View style={styles.macroRow}><View style={styles.macroHeader}><Text style={[styles.macroLabel, { color: colors.textMain }]}>{label}</Text><Text style={[styles.macroValue, { color }]}>{value} · {share}</Text></View><ProgressBar progress={progress} color={color} height={7} /></View>;
}

function ExecutionItem({ icon, title, detail, progress, done, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; progress: number; done: boolean; last?: boolean }) {
  const { colors, globalColors } = useTheme();
  return <View style={[styles.executionItem, !last && { borderBottomColor: colors.borderColor, borderBottomWidth: 1 }]}><View style={[styles.executionIcon, { backgroundColor: done ? `${globalColors.primary}18` : colors.inputBg }]}><Ionicons name={done ? 'checkmark' : icon} size={20} color={done ? globalColors.primary : colors.textMuted} /></View><View style={styles.executionCopy}><Text style={[styles.executionTitle, { color: colors.textMain }]}>{title}</Text><Text style={[styles.executionDetail, { color: colors.textLight }]}>{detail}</Text><ProgressBar progress={progress} color={done ? globalColors.primary : globalColors.carbs} height={5} style={styles.executionProgress} /></View></View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.7 },
  headerSubtitle: { fontSize: 12, marginTop: 3 },
  editButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16 },
  hero: { borderRadius: 26, padding: 21, marginBottom: 25, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  heroBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 15 },
  heroDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 430 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 17 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  metaText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, paddingHorizontal: 2 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { fontSize: 11, marginTop: 2 },
  sectionAction: { fontSize: 11, fontWeight: '800' },
  goalGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  goalCard: { flex: 1, padding: 16 },
  goalIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  goalValue: { fontSize: 20, fontWeight: '900' },
  goalUnit: { fontSize: 11, fontWeight: '700' },
  goalLabel: { fontSize: 11, marginTop: 3 },
  macrosCard: { padding: 17, marginBottom: 25 },
  cardTitle: { fontSize: 15, fontWeight: '900', marginBottom: 14 },
  macroRow: { marginBottom: 13 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroLabel: { fontSize: 12, fontWeight: '700' },
  macroValue: { fontSize: 11, fontWeight: '900' },
  executionCard: { paddingHorizontal: 16, marginBottom: 25 },
  executionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  executionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  executionCopy: { flex: 1 },
  executionTitle: { fontSize: 13, fontWeight: '800' },
  executionDetail: { fontSize: 10, marginTop: 2 },
  executionProgress: { marginTop: 7 },
  mindsetRow: { gap: 9, paddingBottom: 3, marginBottom: 12 },
  mindsetCard: { width: 143, minHeight: 128, borderRadius: 18, borderWidth: 1.5, padding: 14 },
  mindsetIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  mindsetTitle: { fontSize: 12, fontWeight: '900' },
  mindsetSubtitle: { fontSize: 10, lineHeight: 14, marginTop: 4 },
  quoteCard: { padding: 18, borderWidth: 1, marginBottom: 11 },
  quote: { fontSize: 16, lineHeight: 23, fontWeight: '800', marginTop: 9 },
  quoteSource: { fontSize: 10, marginTop: 8 },
  commitmentCard: { padding: 17, marginBottom: 25 },
  commitmentTitleRow: { flexDirection: 'row', alignItems: 'center' },
  commitmentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  commitmentTitleCopy: { flex: 1 },
  commitmentEdit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cardTitleCompact: { fontSize: 14, fontWeight: '900' },
  commitmentHintCompact: { fontSize: 10, marginTop: 2 },
  savedMotivation: { fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 14, paddingLeft: 48 },
  motivationInputCompact: { minHeight: 68, borderRadius: 14, borderWidth: 1.5, padding: 12, fontSize: 13, lineHeight: 18, marginTop: 13 },
  commitmentHint: { fontSize: 11, lineHeight: 16, marginTop: -8, marginBottom: 12 },
  motivationInput: { minHeight: 102, borderRadius: 15, borderWidth: 1.5, padding: 13, fontSize: 13, lineHeight: 19 },
  commitmentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  characterCount: { fontSize: 10 },
  saveMotivation: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  saveMotivationText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  visualProgress: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 21, padding: 15, marginBottom: 16 },
  visualIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  visualCopy: { flex: 1, paddingHorizontal: 13 },
  visualTitle: { fontSize: 14, fontWeight: '900' },
  visualDescription: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  disclaimer: { flexDirection: 'row', gap: 8, borderRadius: 15, padding: 13 },
  disclaimerText: { flex: 1, fontSize: 10, lineHeight: 15 },
  bottomSpacer: { height: 110 },
});
