import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Card, Input, Button } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { state, updateProfile } = useAppState();

  const [name, setName] = useState(state.profile.name);
  const [weight, setWeight] = useState(state.profile.weight.toString());
  const [avatarText, setAvatarText] = useState(state.profile.avatarText);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio.');
      return;
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Erro', 'Peso inválido.');
      return;
    }

    updateProfile({
      name,
      weight: parsedWeight,
      avatarText: avatarText.trim() ? avatarText.substring(0, 2) : 'U',
    });

    Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.content, { backgroundColor: colors.bgApp }]}>
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <LinearGradient
              colors={[globalColors.primaryGlow, globalColors.primary]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{avatarText.trim() ? avatarText.substring(0, 2).toUpperCase() : 'U'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Input
                label="Iniciais do Avatar"
                value={avatarText}
                onChangeText={setAvatarText}
                placeholder="Ex: P"
              />
            </View>
          </View>

          <Input
            label="Nome do Usuário"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Pedro"
          />

          <Input
            label="Peso Corporal (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="Ex: 78"
            keyboardType="numeric"
          />

          <Button
            title="Salvar Perfil"
            onPress={handleSave}
            variant="primary"
            style={styles.saveBtn}
          />
        </Card>
      </View>
    </BaseScreen>
  );
}

// Inline Pressable mapping for the back button since we need Pressable in this scope
const Pressable = require('react-native').Pressable;

const styles = StyleSheet.create({
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  saveBtn: {
    marginTop: 16,
    height: 52,
  },
});
