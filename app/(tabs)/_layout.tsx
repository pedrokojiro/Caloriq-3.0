import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { layout } from '../../src/theme/layout';
import { useAuth } from '../../src/context/AuthContext';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '../../src/theme/motion';
import { triggerHaptic } from '../../src/utils/haptics';

type TabVisual = { icon: string; label: string; isScanner: boolean };

function TabItem({ item, focused, onPress, primary, muted }: { item: TabVisual; focused: boolean; onPress: () => void; primary: string; muted: string }) {
  return (
    <Pressable onPress={() => { if (!focused) void triggerHaptic('selection'); onPress(); }} style={styles.tabItem} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label}>
      <View style={styles.iconWrapper}>
        <Ionicons name={item.icon as any} size={22} color={focused ? primary : muted} />
      </View>
      <Text style={[styles.tabLabel, { color: focused ? primary : muted }, focused && styles.tabLabelActive]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{item.label}</Text>
    </Pressable>
  );
}

// Escanear fica no centro, no mesmo nível das outras abas: um quadrado verde
// discreto, sem brilho nem botão saltado para fora da barra.
function ScannerTabItem({ focused, onPress, primary, action, muted }: { focused: boolean; onPress: () => void; primary: string; action: string; muted: string }) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const buttonMotion = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : (pressed.value ? 0.94 : 1) }],
  }));
  return (
    <Pressable
      onPress={() => { void triggerHaptic('medium'); onPress(); }}
      onPressIn={() => { pressed.set(withSpring(1, motion.spring.button)); }}
      onPressOut={() => { pressed.set(withSpring(0, motion.spring.button)); }}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel="Escanear refeição"
    >
      <Animated.View style={[styles.scannerButton, { backgroundColor: action }, buttonMotion]}>
        <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
      </Animated.View>
      <Text style={[styles.tabLabel, { color: focused ? primary : muted }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>Escanear</Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { colors, globalColors } = useTheme();
  const insets = useSafeAreaInsets();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.onboardingCompleted) return <Redirect href={'/(auth)/profile-setup' as never} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={({ state, navigation }) => {
        // No Scanner a barra usa o tema câmera (sempre escuro) para não criar uma faixa clara sobre a imagem.
        const onCamera = state.routes[state.index]?.name === 'scanner';
        const barColors = onCamera
          ? { bg: '#0B0F0D', border: '#2A312D', active: '#3DD68C', muted: '#A3ADA7' }
          : { bg: colors.bgNav, border: colors.hairline, active: colors.textMain, muted: colors.textLight };
        return (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: barColors.bg,
                borderTopColor: barColors.border,
                paddingBottom: Math.max(insets.bottom, 8),
              },
            ]}
          >
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const getIconAndLabel = () => {
                switch (route.name) {
                  case 'index':
                    return {
                      icon: isFocused ? 'home' : 'home-outline',
                      label: 'Início',
                      isScanner: false,
                    };
                  case 'analytics':
                    return {
                      icon: isFocused ? 'stats-chart' : 'stats-chart-outline',
                      label: 'Analytics',
                      isScanner: false,
                    };
                  case 'scanner':
                    return {
                      icon: 'scan',
                      label: 'Escanear',
                      isScanner: true,
                    };
                  case 'goals':
                    return {
                      icon: isFocused ? 'disc' : 'disc-outline',
                      label: 'Metas',
                      isScanner: false,
                    };
                  case 'profile':
                    return {
                      icon: isFocused ? 'person' : 'person-outline',
                      label: 'Perfil',
                      isScanner: false,
                    };
                  default:
                    return {
                      icon: 'help',
                      label: 'Info',
                      isScanner: false,
                    };
                }
              };

              const item = getIconAndLabel();

              if (item.isScanner) {
                return (
                  <ScannerTabItem
                    key={route.key}
                    onPress={onPress}
                    focused={isFocused}
                    primary={barColors.active}
                    action={globalColors.action}
                    muted={barColors.muted}
                  />
                );
              }

              return (
                <TabItem
                  key={route.key}
                  item={item}
                  focused={isFocused}
                  onPress={onPress}
                  primary={barColors.active}
                  muted={barColors.muted}
                />
              );
            })}
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="scanner" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    minHeight: layout.tabBarHeight,
    paddingTop: 6,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  tabLabelActive: { fontWeight: '600' },
  scannerButton: { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
