import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BaseScreen, Button, Card } from '../../src/components';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import { deleteProgressPhoto, readProgressPhotos, saveProgressPhoto, type ProgressPhoto, type ProgressPhotoAngle } from '../../src/services/progress-photos';

const angles: { value: ProgressPhotoAngle; label: string }[] = [
  { value: 'front', label: 'Frente' }, { value: 'side', label: 'Lado' }, { value: 'back', label: 'Costas' },
];
const angleLabel = { front: 'Frente', side: 'Lado', back: 'Costas' } as const;

export default function VisualProgressScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { state } = useAppState();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [angle, setAngle] = useState<ProgressPhotoAngle>('front');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const filteredPhotos = photos.filter(photo => photo.angle === angle);

  useEffect(() => { void readProgressPhotos().then(setPhotos); }, []);

  const persistAsset = async (asset?: ImagePicker.ImagePickerAsset) => {
    if (!asset?.uri) return;
    setSaving(true);
    try {
      const photo = await saveProgressPhoto(asset.uri, angle, state.profile.weight || undefined);
      setPhotos(current => [photo, ...current]);
    } catch {
      Alert.alert('Não foi possível guardar', 'Tente novamente ou escolha outra imagem.');
    } finally { setSaving(false); }
  };

  const camera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Permita o uso da câmera para registrar sua evolução.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!result.canceled) await persistAsset(result.assets[0]);
  };

  const gallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Permita o acesso às fotos para registrar sua evolução.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!result.canceled) await persistAsset(result.assets[0]);
  };

  const toggleSelected = (id: string) => setSelected(current => current.includes(id)
    ? current.filter(item => item !== id)
    : current.length < 2 ? [...current, id] : [current[1], id]);

  const remove = (photo: ProgressPhoto) => Alert.alert('Apagar esta foto?', 'A imagem será removida permanentemente deste aparelho.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: () => void deleteProgressPhoto(photo).then(() => {
      setPhotos(current => current.filter(item => item.id !== photo.id));
      setSelected(current => current.filter(id => id !== photo.id));
    }) },
  ]);

  const comparison = selected.map(id => filteredPhotos.find(photo => photo.id === id)).filter(Boolean) as ProgressPhoto[];
  const changeAngle = (nextAngle: ProgressPhotoAngle) => {
    setAngle(nextAngle);
    setSelected([]);
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="arrow-back" size={23} color={colors.textMain} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.textMain }]}>Evolução visual</Text><Text style={[styles.headerSubtitle, { color: colors.textLight }]}>Seu registro privado</Text></View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.bgApp }]} showsVerticalScrollIndicator={false}>
        <Card style={[styles.privacyCard, { borderColor: `${globalColors.primary}35` }]}>
          <View style={[styles.privacyIcon, { backgroundColor: `${globalColors.primary}16` }]}><Ionicons name="lock-closed" size={20} color={globalColors.primary} /></View>
          <View style={styles.privacyCopy}><Text style={[styles.privacyTitle, { color: colors.textMain }]}>Privado por padrão</Text><Text style={[styles.privacyText, { color: colors.textLight }]}>Estas fotos ficam somente no espaço privado deste aplicativo no aparelho. A IA não analisa nem envia as imagens.</Text></View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Novo registro</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>Escolha o mesmo ângulo em cada registro para comparar melhor.</Text>
        <View style={styles.angleRow}>{angles.map(item => <Pressable key={item.value} onPress={() => changeAngle(item.value)} style={[styles.angleChip, { backgroundColor: angle === item.value ? `${globalColors.primary}18` : colors.bgCard, borderColor: angle === item.value ? globalColors.primary : colors.borderColor }]}><Text style={[styles.angleText, { color: angle === item.value ? globalColors.primary : colors.textMuted }]}>{item.label}</Text></Pressable>)}</View>
        <View style={styles.addRow}>
          <Button title="Tirar foto" onPress={camera} loading={saving} icon={<Ionicons name="camera-outline" size={18} color="#FFF" />} style={styles.addButton} />
          <Button title="Galeria" onPress={gallery} disabled={saving} variant="outline" icon={<Ionicons name="images-outline" size={18} color={globalColors.primary} />} style={styles.addButton} />
        </View>

        {comparison.length === 2 ? (
          <View style={styles.compareSection}>
            <View style={styles.compareHeader}><Text style={[styles.sectionTitle, { color: colors.textMain }]}>Antes e agora</Text><Pressable onPress={() => setSelected([])}><Text style={[styles.clearText, { color: globalColors.primary }]}>Limpar seleção</Text></Pressable></View>
            <Card style={styles.compareCard}>{comparison.map((photo, index) => <View key={photo.id} style={styles.compareItem}><Image source={{ uri: photo.uri }} style={styles.compareImage} /><View style={styles.compareLabel}><Text style={styles.compareLabelText}>{index === 0 ? 'ANTES' : 'AGORA'}</Text></View><Text style={[styles.compareDate, { color: colors.textMuted }]}>{new Date(photo.createdAt).toLocaleDateString('pt-BR')}</Text></View>)}</Card>
          </View>
        ) : null}

        <View style={styles.timelineHeader}><View><Text style={[styles.sectionTitle, { color: colors.textMain }]}>Linha do tempo · {angleLabel[angle]}</Text><Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>Selecione duas fotos do mesmo ângulo para comparar.</Text></View><Text style={[styles.count, { color: colors.textMuted }]}>{filteredPhotos.length} foto{filteredPhotos.length === 1 ? '' : 's'}</Text></View>
        {filteredPhotos.length === 0 ? (
          <Card style={styles.emptyCard}><View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}><Ionicons name="images-outline" size={28} color={colors.textLight} /></View><Text style={[styles.emptyTitle, { color: colors.textMain }]}>Nenhum registro de {angleLabel[angle].toLowerCase()}</Text><Text style={[styles.emptyText, { color: colors.textLight }]}>Adicione uma foto neste ângulo para começar esta linha do tempo.</Text></Card>
        ) : (
          <View style={styles.grid}>{filteredPhotos.map(photo => {
            const isSelected = selected.includes(photo.id);
            return <View key={photo.id} style={[styles.photoCard, { backgroundColor: colors.bgCard, borderColor: isSelected ? globalColors.primary : colors.borderColor }]}>
              <Pressable onPress={() => toggleSelected(photo.id)}><Image source={{ uri: photo.uri }} style={styles.photo} /><View style={[styles.selectBadge, { backgroundColor: isSelected ? globalColors.primary : 'rgba(5,12,8,0.62)' }]}><Ionicons name={isSelected ? 'checkmark' : 'add'} size={16} color="#FFF" /></View></Pressable>
              <View style={styles.photoInfo}><View><Text style={[styles.photoDate, { color: colors.textMain }]}>{new Date(photo.createdAt).toLocaleDateString('pt-BR')}</Text><Text style={[styles.photoMeta, { color: colors.textLight }]}>{angleLabel[photo.angle]}{photo.weight ? ` · ${photo.weight} kg` : ''}</Text></View><Pressable onPress={() => remove(photo)} style={styles.deleteButton}><Ionicons name="trash-outline" size={18} color="#E5484D" /></Pressable></View>
            </View>;
          })}</View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSubtitle: { fontSize: 10, marginTop: 2 },
  content: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18 },
  privacyCard: { padding: 15, borderWidth: 1, flexDirection: 'row', marginBottom: 23 },
  privacyIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  privacyCopy: { flex: 1 },
  privacyTitle: { fontSize: 13, fontWeight: '900' },
  privacyText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  angleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  angleChip: { flex: 1, height: 43, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  angleText: { fontSize: 12, fontWeight: '800' },
  addRow: { flexDirection: 'row', gap: 9, marginTop: 11, marginBottom: 25 },
  addButton: { flex: 1 },
  compareSection: { marginBottom: 24 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clearText: { fontSize: 11, fontWeight: '800' },
  compareCard: { flexDirection: 'row', gap: 9, padding: 11 },
  compareItem: { flex: 1, position: 'relative' },
  compareImage: { width: '100%', aspectRatio: 0.75, borderRadius: 14, backgroundColor: '#DDE5E0' },
  compareLabel: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(5,12,8,0.7)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  compareLabelText: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  compareDate: { fontSize: 10, textAlign: 'center', marginTop: 6 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  count: { fontSize: 10, fontWeight: '700' },
  emptyCard: { padding: 28, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '900' },
  emptyText: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5, maxWidth: 280 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: { width: '48.4%', borderRadius: 17, borderWidth: 1.5, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 0.75, backgroundColor: '#DDE5E0' },
  selectBadge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  photoInfo: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  photoDate: { fontSize: 11, fontWeight: '900' },
  photoMeta: { fontSize: 9, marginTop: 2 },
  deleteButton: { marginLeft: 'auto', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bottomSpacer: { height: 80 },
});
