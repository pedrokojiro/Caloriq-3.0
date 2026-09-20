import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BaseScreen, Button, Card, Input, ProfileAvatar } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import { calculateNutritionTargets, type ActivityLevel, type CalculationSex, type NutritionObjective } from '../../src/utils/nutrition';

const activityOptions: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentário', description: 'Pouco ou nenhum exercício' },
  { value: 'light', label: 'Leve', description: 'Exercício 1–3 dias por semana' },
  { value: 'moderate', label: 'Moderado', description: 'Exercício 3–5 dias por semana' },
  { value: 'active', label: 'Ativo', description: 'Exercício 6–7 dias por semana' },
  { value: 'very_active', label: 'Muito ativo', description: 'Treino intenso ou trabalho físico' },
];

const objectiveOptions: { value: NutritionObjective; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose', label: 'Perder', icon: 'trending-down-outline' },
  { value: 'maintain', label: 'Manter', icon: 'remove-outline' },
  { value: 'gain', label: 'Ganhar', icon: 'trending-up-outline' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { user } = useAuth();
  const { state, updateProfile } = useAppState();
  const profile = state.profile;
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl || null);
  const [age, setAge] = useState(profile.age?.toString() || '');
  const [height, setHeight] = useState(profile.heightCm?.toString() || '');
  const [weight, setWeight] = useState(profile.weight ? profile.weight.toString() : '');
  const [sex, setSex] = useState<CalculationSex>(profile.calculationSex || 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel || 'moderate');
  const [objective, setObjective] = useState<NutritionObjective>(profile.objective || 'maintain');
  const [recalculateGoals, setRecalculateGoals] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const values = useMemo(() => ({
    age: Number(age), heightCm: Number(height.replace(',', '.')), weight: Number(weight.replace(',', '.')),
  }), [age, height, weight]);
  const validProfile = Number.isInteger(values.age) && values.age >= 18 && values.age <= 100
    && values.heightCm >= 120 && values.heightCm <= 230 && values.weight >= 30 && values.weight <= 350;
  const preview = validProfile ? calculateNutritionTargets({ sex, ...values, activityLevel, objective }) : null;

  const prepareImage = (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return Alert.alert('Foto indisponível', 'Não foi possível preparar essa imagem. Tente outra foto.');
    const mimeType = asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) ? asset.mimeType : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    if (dataUrl.length > 1_500_000) return Alert.alert('Foto muito grande', 'Escolha uma imagem menor para usar no perfil.');
    setAvatarUrl(dataUrl);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma imagem de perfil.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.45, base64: true });
    if (!result.canceled && result.assets[0]) prepareImage(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Permita o uso da câmera para tirar uma foto de perfil.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.45, base64: true });
    if (!result.canceled && result.assets[0]) prepareImage(result.assets[0]);
  };

  const handleSave = async () => {
    if (name.trim().length < 2) return setError('Informe um nome válido.');
    if (!validProfile) return setError('Revise idade, altura e peso antes de salvar.');
    setError('');
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(), avatarText: Array.from(name.trim())[0].toUpperCase(), avatarUrl,
        age: values.age, heightCm: values.heightCm, weight: values.weight, calculationSex: sex,
        activityLevel, objective, recalculateGoals,
      });
      Alert.alert('Perfil atualizado', recalculateGoals
        ? 'Seus dados e metas nutricionais foram atualizados.'
        : 'Seus dados foram salvos e suas metas atuais foram mantidas.', [
        { text: 'Concluir', onPress: () => router.back() },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o perfil.');
    } finally { setSaving(false); }
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="arrow-back" size={23} color={colors.textMain} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.textMain }]}>Editar perfil</Text><Text style={[styles.headerSubtitle, { color: colors.textLight }]}>Personalize seus dados e metas</Text></View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.bgApp }]} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <Card style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            <ProfileAvatar name={name} avatarText={profile.avatarText} avatarUrl={avatarUrl || undefined} size={104} />
            <View style={[styles.cameraBadge, { backgroundColor: globalColors.primary }]}><Ionicons name="camera" size={17} color="#FFF" /></View>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Sua foto</Text>
          <Text style={[styles.avatarHint, { color: colors.textLight }]}>Use uma foto quadrada. Você poderá trocar ou remover quando quiser.</Text>
          <View style={styles.photoActions}>
            <PhotoAction icon="camera-outline" label="Câmera" onPress={takePhoto} />
            <PhotoAction icon="images-outline" label="Galeria" onPress={pickFromGallery} />
            <PhotoAction icon="trash-outline" label="Remover" danger disabled={!avatarUrl} onPress={() => setAvatarUrl(null)} />
          </View>
        </Card>

        <SectionHeader icon="person-outline" title="Dados pessoais" subtitle="Informações usadas na sua conta" />
        <Card style={styles.card}>
          <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          <View style={[styles.readOnlyField, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <View style={styles.readOnlyCopy}><Text style={[styles.readOnlyLabel, { color: colors.textMuted }]}>E-mail</Text><Text style={[styles.readOnlyValue, { color: colors.textMain }]} numberOfLines={1}>{user?.email || '—'}</Text></View>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textLight} />
          </View>
          <Text style={[styles.emailHint, { color: colors.textLight }]}>A alteração de e-mail exigirá confirmação e será adicionada futuramente.</Text>
          <View style={styles.twoColumns}>
            <Input label="Idade" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Ex.: 24" style={styles.flexInput} />
            <Input label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Ex.: 175" style={styles.flexInput} />
          </View>
          <Input label="Peso atual (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Ex.: 78" />
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Sexo usado no cálculo metabólico</Text>
          <View style={styles.twoColumns}>
            <ChoiceChip label="Feminino" selected={sex === 'female'} onPress={() => setSex('female')} />
            <ChoiceChip label="Masculino" selected={sex === 'male'} onPress={() => setSex('male')} />
          </View>
        </Card>

        <SectionHeader icon="fitness-outline" title="Rotina e objetivo" subtitle="Refina o cálculo das suas necessidades" />
        <Card style={styles.card}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Nível de atividade</Text>
          {activityOptions.map(option => (
            <Pressable key={option.value} onPress={() => setActivityLevel(option.value)} style={[styles.optionRow, { backgroundColor: colors.inputBg, borderColor: activityLevel === option.value ? globalColors.primary : colors.inputBorder }]}>
              <Ionicons name={activityLevel === option.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={activityLevel === option.value ? globalColors.primary : colors.textLight} />
              <View style={styles.optionCopy}><Text style={[styles.optionTitle, { color: colors.textMain }]}>{option.label}</Text><Text style={[styles.optionDescription, { color: colors.textLight }]}>{option.description}</Text></View>
            </Pressable>
          ))}
          <Text style={[styles.fieldLabel, styles.objectiveLabel, { color: colors.textMuted }]}>Objetivo</Text>
          <View style={styles.objectiveRow}>
            {objectiveOptions.map(option => (
              <Pressable key={option.value} onPress={() => setObjective(option.value)} style={[styles.objectiveCard, { backgroundColor: colors.inputBg, borderColor: objective === option.value ? globalColors.primary : colors.inputBorder }]}>
                <Ionicons name={option.icon} size={21} color={objective === option.value ? globalColors.primary : colors.textLight} />
                <Text style={[styles.objectiveText, { color: objective === option.value ? globalColors.primary : colors.textMuted }]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionHeader icon="calculator-outline" title="Metas nutricionais" subtitle="Escolha como aplicar as alterações" />
        <Card style={styles.card}>
          <View style={styles.recalculateRow}>
            <View style={styles.recalculateCopy}><Text style={[styles.optionTitle, { color: colors.textMain }]}>Recalcular automaticamente</Text><Text style={[styles.optionDescription, { color: colors.textLight }]}>Atualiza calorias, macros e água usando seu novo perfil.</Text></View>
            <Switch value={recalculateGoals} onValueChange={setRecalculateGoals} trackColor={{ false: '#CBD0D8', true: globalColors.primary }} thumbColor="#FFF" />
          </View>
          {recalculateGoals && preview ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewEyebrow}>PRÉVIA DAS NOVAS METAS</Text>
              <Text style={styles.previewCalories}>{preview.calories.toLocaleString('pt-BR')} <Text style={styles.previewUnit}>kcal/dia</Text></Text>
              <View style={styles.previewMetrics}><PreviewMetric label="Proteína" value={`${preview.protein}g`} /><PreviewMetric label="Carbo" value={`${preview.carbs}g`} /><PreviewMetric label="Gordura" value={`${preview.fat}g`} /><PreviewMetric label="Água" value={`${preview.water}ml`} /></View>
            </View>
          ) : null}
          {!recalculateGoals ? <Text style={[styles.keepGoals, { color: colors.textMuted }]}>As metas atuais serão preservadas.</Text> : null}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Salvar alterações" onPress={handleSave} loading={saving} disabled={!validProfile || !name.trim()} style={styles.saveButton} />
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </BaseScreen>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const { colors, globalColors } = useTheme();
  return <View style={styles.sectionHeader}><View style={[styles.sectionIcon, { backgroundColor: `${globalColors.primary}16` }]}><Ionicons name={icon} size={19} color={globalColors.primary} /></View><View><Text style={[styles.sectionTitle, { color: colors.textMain }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>{subtitle}</Text></View></View>;
}

function PhotoAction({ icon, label, onPress, danger, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { colors, globalColors } = useTheme();
  const color = danger ? globalColors.danger : globalColors.primary;
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.photoAction, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, disabled && styles.disabled, pressed && styles.pressed]}><Ionicons name={icon} size={20} color={color} /><Text style={[styles.photoActionText, { color }]}>{label}</Text></Pressable>;
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, globalColors } = useTheme();
  return <Pressable onPress={onPress} style={[styles.choiceChip, { backgroundColor: colors.inputBg, borderColor: selected ? globalColors.primary : colors.inputBorder }]}><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={selected ? globalColors.primary : colors.textLight} /><Text style={[styles.choiceText, { color: selected ? globalColors.primary : colors.textMuted }]}>{label}</Text></Pressable>;
}

function PreviewMetric({ label, value }: { label: string; value: string }) { return <View style={styles.previewMetric}><Text style={styles.previewMetricValue}>{value}</Text><Text style={styles.previewMetricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  content: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18 },
  avatarCard: { padding: 20, alignItems: 'center', marginBottom: 22 },
  avatarWrap: { marginBottom: 13, position: 'relative' },
  cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  avatarHint: { fontSize: 12, lineHeight: 17, textAlign: 'center', maxWidth: 330, marginTop: 4 },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 16, width: '100%' },
  photoAction: { flex: 1, minHeight: 61, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoActionText: { fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.36 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 3 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { fontSize: 11, marginTop: 2 },
  card: { padding: 18, marginBottom: 22 },
  readOnlyField: { minHeight: 61, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  readOnlyCopy: { flex: 1 },
  readOnlyLabel: { fontSize: 11, fontWeight: '700' },
  readOnlyValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  emailHint: { fontSize: 10, lineHeight: 15, marginTop: 5, marginBottom: 16 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  flexInput: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  choiceChip: { flex: 1, minHeight: 49, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  choiceText: { fontSize: 13, fontWeight: '800' },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 11, marginBottom: 8, gap: 10 },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 13, fontWeight: '800' },
  optionDescription: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  objectiveLabel: { marginTop: 9 },
  objectiveRow: { flexDirection: 'row', gap: 8 },
  objectiveCard: { flex: 1, minHeight: 70, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 5 },
  objectiveText: { fontSize: 11, fontWeight: '800' },
  recalculateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recalculateCopy: { flex: 1 },
  previewCard: { backgroundColor: '#10261A', borderRadius: 18, padding: 16, marginTop: 16 },
  previewEyebrow: { color: '#8FD7AE', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  previewCalories: { color: '#FFF', fontSize: 25, fontWeight: '900', marginTop: 4 },
  previewUnit: { color: '#A9BDAF', fontSize: 12, fontWeight: '700' },
  previewMetrics: { flexDirection: 'row', marginTop: 13, borderTopWidth: 1, borderTopColor: '#294033', paddingTop: 12 },
  previewMetric: { flex: 1 },
  previewMetricValue: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  previewMetricLabel: { color: '#8EA398', fontSize: 9, marginTop: 2 },
  keepGoals: { marginTop: 13, fontSize: 12 },
  error: { color: '#D92D20', fontSize: 13, lineHeight: 18, marginBottom: 12, textAlign: 'center' },
  saveButton: { height: 57 },
  bottomSpacer: { height: 100 },
});
