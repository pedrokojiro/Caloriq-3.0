import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Card } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, globalColors, toggleTheme, theme, isDark } = useTheme();
  const { state } = useAppState();
  const { profile } = state;

  const handleLogout = () => {
    // Navigate back to onboarding
    router.replace('/(auth)/onboarding');
  };

  const OptionItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    iconColor = colors.textMuted,
    iconBg = colors.inputBg 
  }: { 
    icon: string; 
    title: string; 
    subtitle?: string; 
    onPress: () => void;
    iconColor?: string;
    iconBg?: string;
  }) => (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionItem,
        { borderBottomColor: colors.borderColor },
        pressed && { backgroundColor: colors.inputBg }
      ]}
    >
      <View style={[styles.optionIconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.optionTextContainer}>
        <Text style={[styles.optionTitle, { color: colors.textMain }]}>{title}</Text>
        {subtitle && <Text style={[styles.optionSubtitle, { color: colors.textLight }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </Pressable>
  );

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Meu Perfil</Text>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgApp }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card style={styles.profileCard}>
          <LinearGradient
            colors={[globalColors.primaryGlow, globalColors.primary]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{profile.avatarText}</Text>
          </LinearGradient>
          <Text style={[styles.profileName, { color: colors.textMain }]}>{profile.name}</Text>
          <Text style={[styles.profileWeight, { color: colors.textMuted }]}>
            {profile.weight} kg · {profile.streak} dias de foco 🔥
          </Text>
        </Card>

        {/* Configurations List */}
        <Card style={styles.optionsListCard}>
          <OptionItem
            icon="person-outline"
            iconColor={globalColors.primary}
            iconBg="#EDFBF3"
            title="Editar Perfil"
            subtitle="Altere seu nome, peso e avatar"
            onPress={() => router.push('/sub-screens/edit-profile')}
          />
          <OptionItem
            icon="notifications-outline"
            iconColor={globalColors.carbs}
            iconBg="#EEF4FF"
            title="Configurações de Notificação"
            subtitle="Defina alertas de refeições e streak"
            onPress={() => router.push('/sub-screens/notifications')}
          />
          <OptionItem
            icon="alarm-outline"
            iconColor={globalColors.protein}
            iconBg="#FFF3EC"
            title="Lembretes de Água & Macros"
            subtitle="Agende avisos de consumo de água"
            onPress={() => router.push('/sub-screens/reminders')}
          />
          <OptionItem
            icon="watch-outline"
            iconColor={globalColors.fat}
            iconBg="#FFFBEB"
            title="Dispositivos e Apps"
            subtitle="Conecte seu Apple Health ou Smartwatch"
            onPress={() => router.push('/sub-screens/devices')}
          />
        </Card>

        {/* Theme Settings Section */}
        <Card style={styles.themeToggleCard}>
          <View style={styles.themeToggleRow}>
            <View style={[styles.optionIconContainer, { backgroundColor: isDark ? '#1A1F2A' : '#F8F9FA' }]}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={isDark ? globalColors.primaryGlow : globalColors.fat} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.textMain }]}>Tema Escuro</Text>
              <Text style={[styles.optionSubtitle, { color: colors.textLight }]}>
                {isDark ? 'Tema escuro ativado' : 'Tema claro ativado'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD0D8', true: globalColors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>
        </Card>

        {/* Logout CTA */}
        <Pressable 
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
            pressed && { backgroundColor: colors.inputBg }
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={globalColors.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutBtnText, { color: globalColors.danger }]}>Sair da conta</Text>
        </Pressable>

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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
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
  profileCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#1AAF5D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  profileWeight: {
    fontSize: 13,
    marginTop: 4,
  },
  optionsListCard: {
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  themeToggleCard: {
    padding: 16,
    marginBottom: 14,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});
