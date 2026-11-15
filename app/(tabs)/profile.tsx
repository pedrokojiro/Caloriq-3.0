import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Card, ProfileAvatar } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { type } from '../../src/theme/type';
import { layout } from '../../src/theme/layout';

type Option = { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress: () => void };

// Lista de ajustes: ícone neutro, título e uma linha de apoio. Sem quadrados coloridos.
function OptionList({ options }: { options: Option[] }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.list}>
      {options.map((option, index) => (
        <Pressable
          key={option.title}
          onPress={option.onPress}
          style={({ pressed }) => [
            styles.optionItem,
            index > 0 && { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth * 2 },
            pressed && { backgroundColor: colors.track },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name={option.icon} size={22} color={colors.textMuted} />
          <View style={styles.flex}>
            <Text style={[type.body, { color: colors.textMain }]}>{option.title}</Text>
            {option.subtitle ? <Text style={[type.caption, { color: colors.textMuted }]}>{option.subtitle}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </Pressable>
      ))}
    </Card>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, globalColors, toggleTheme, isDark } = useTheme();
  const { state } = useAppState();
  const { profile } = state;
  const { user, logout } = useAuth();
  const showDevTools = process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const account: Option[] = [
    { icon: 'person-outline', title: 'Editar perfil', subtitle: 'Foto, dados pessoais e perfil nutricional', onPress: () => router.push('/sub-screens/edit-profile') },
    { icon: 'shield-checkmark-outline', title: 'Privacidade e conta', subtitle: 'Senha, aparelhos, seus dados e exclusão', onPress: () => router.push('/sub-screens/account') },
  ];
  const preferences: Option[] = [
    { icon: 'notifications-outline', title: 'Notificações', subtitle: 'Alertas de refeições e sequência', onPress: () => router.push('/sub-screens/notifications') },
    { icon: 'alarm-outline', title: 'Lembretes', subtitle: 'Horários de água e refeições', onPress: () => router.push('/sub-screens/reminders') },
    { icon: 'watch-outline', title: 'Dispositivos e apps', subtitle: 'Apple Saúde ou smartwatch', onPress: () => router.push('/sub-screens/devices') },
  ];
  const devTools: Option[] = [
    { icon: 'server-outline', title: 'Configuração da apresentação', subtitle: 'Conexão com o servidor e testes', onPress: () => router.push('../sub-screens/presentation-settings') },
    { icon: 'pulse-outline', title: 'Diagnóstico do banco', subtitle: 'Conexão e registros salvos', onPress: () => router.push('../sub-screens/database-diagnostics') },
  ];

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[type.title, { color: colors.textMain }]} accessibilityRole="header">Perfil</Text>
        </View>

        <View style={styles.identity}>
          <ProfileAvatar name={profile.name} avatarText={profile.avatarText} avatarUrl={profile.avatarUrl} size={64} />
          <View style={styles.flex}>
            <Text style={[type.title, { color: colors.textMain }]} numberOfLines={1}>{profile.name}</Text>
            {user?.email ? <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{user.email}</Text> : null}
            <Text style={[type.caption, type.number, { color: colors.textMuted }]}>
              {profile.weight} kg · {profile.streak} {profile.streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </Text>
          </View>
        </View>

        <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]}>Conta</Text>
        <OptionList options={account} />

        <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]}>Preferências</Text>
        <OptionList options={preferences} />

        <Card style={styles.themeRow}>
          <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.textMuted} />
          <Text style={[type.body, styles.flex, { color: colors.textMain }]}>Tema escuro</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.inputBorder, true: globalColors.action }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            accessibilityLabel="Tema escuro"
          />
        </Card>

        {showDevTools ? (
          <>
            <Text style={[type.overline, styles.sectionLabel, { color: colors.textMuted }]}>Desenvolvimento</Text>
            <OptionList options={devTools} />
          </>
        ) : null}

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logout, pressed && { backgroundColor: colors.track }]}
          accessibilityRole="button"
        >
          <Text style={[type.body, type.strong, { color: colors.dangerText }]}>Sair da conta</Text>
        </Pressable>

        <View style={{ height: layout.tabBarHeight + Math.max(insets.bottom, 8) + 24 }} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  titleRow: { minHeight: 48, justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  sectionLabel: { marginTop: 8, marginBottom: -8 },
  list: { paddingHorizontal: 0 },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, minHeight: 64 },
  logout: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
