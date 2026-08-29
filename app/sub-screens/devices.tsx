import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { BaseScreen, Card } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';

export default function DevicesScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();

  // Local switch states
  const [appleHealth, setAppleHealth] = useState(false);
  const [garmin, setGarmin] = useState(false);
  const [fitbit, setFitbit] = useState(false);

  const IntegrationRow = ({
    title,
    subtitle,
    value,
    onValueChange,
    icon,
    iconColor = colors.textMuted,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    icon: string;
    iconColor?: string;
  }) => (
    <View style={[styles.row, { borderBottomColor: colors.borderColor }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.inputBg }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#CBD0D8', true: globalColors.primary }}
        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
      />
    </View>
  );

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Dispositivos & Apps</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Sincronização Nativa</Text>
          <IntegrationRow
            title="Apple Health / Google Fit"
            subtitle="Importar dados de passos, treinos e peso de forma automática"
            value={appleHealth}
            onValueChange={setAppleHealth}
            icon="heart-outline"
            iconColor={globalColors.danger}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Wearables de Terceiros</Text>
          <IntegrationRow
            title="Garmin Connect"
            subtitle="Sincronizar treinos e frequência cardíaca"
            value={garmin}
            onValueChange={setGarmin}
            icon="watch-outline"
            iconColor={globalColors.carbs}
          />
          <IntegrationRow
            title="Fitbit Sync"
            subtitle="Importar calorias queimadas e dados de sono"
            value={fitbit}
            onValueChange={setFitbit}
            icon="pulse-outline"
            iconColor={globalColors.primaryGlow}
          />
        </Card>
      </ScrollView>
    </BaseScreen>
  );
}

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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
