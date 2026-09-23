import React, { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { motion } from '../../src/theme/motion';
import { triggerHaptic } from '../../src/utils/haptics';

type TabVisual = { icon: string; label: string; isScanner: boolean };

function TabItem({ item, focused, onPress, primary, muted }: { item: TabVisual; focused: boolean; onPress: () => void; primary: string; muted: string }) {
  const active = useSharedValue(focused ? 1 : 0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    active.value = reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, motion.spring.tab);
  }, [active, focused, reduceMotion]);
  const iconMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : -3 * active.value },
      { scale: reduceMotion ? 1 : 1 + 0.08 * active.value },
    ],
  }));
  const indicatorMotion = useAnimatedStyle(() => ({
    opacity: withTiming(active.value, { duration: motion.duration.fast }),
    transform: [{ scale: 0.82 + active.value * 0.18 }],
  }));
  return (
    <Pressable onPress={() => { if (!focused) void triggerHaptic('selection'); onPress(); }} style={styles.tabItem}>
      <Animated.View style={[styles.activeIndicator, { backgroundColor: `${primary}14` }, indicatorMotion]} />
      <Animated.View style={[styles.iconWrapper, iconMotion]}>
        <Ionicons name={item.icon as any} size={22} color={focused ? primary : muted} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color: focused ? primary : muted }]}>{item.label}</Text>
    </Pressable>
  );
}

function ScannerTabItem({ focused, onPress, primary, primaryDark, muted }: { focused: boolean; onPress: () => void; primary: string; primaryDark: string; muted: string }) {
  const active = useSharedValue(focused ? 1 : 0);
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    active.value = reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, motion.spring.tab);
  }, [active, focused, reduceMotion]);
  const buttonMotion = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : (1 + active.value * 0.055) * (pressed.value ? 0.94 : 1) }],
  }));
  const glowMotion = useAnimatedStyle(() => ({ opacity: 0.12 + active.value * 0.2, transform: [{ scale: 1 + active.value * 0.12 }] }));
  return (
    <Pressable
      onPress={() => { void triggerHaptic('medium'); onPress(); }}
      onPressIn={() => { pressed.set(withSpring(1, motion.spring.button)); }}
      onPressOut={() => { pressed.set(withSpring(0, motion.spring.button)); }}
      style={styles.scannerTabItem}
    >
      <Animated.View style={[styles.scannerGlow, { backgroundColor: primary }, glowMotion]} />
      <Animated.View style={buttonMotion}>
        <LinearGradient colors={[primary, primaryDark]} style={styles.scannerButton}>
          <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.tabLabel, { color: focused ? primary : muted, marginTop: 4 }]}>Escanear</Text>
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
        return (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: colors.bgNav,
                borderTopColor: colors.borderColor,
                paddingBottom: Math.max(insets.bottom, 12),
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
                    primary={globalColors.primaryGlow}
                    primaryDark={globalColors.primaryDark}
                    muted={colors.textLight}
                  />
                );
              }

              return (
                <TabItem
                  key={route.key}
                  item={item}
                  focused={isFocused}
                  onPress={onPress}
                  primary={globalColors.primary}
                  muted={colors.textLight}
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
    borderTopWidth: 1,
    paddingTop: 10,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: { position: 'absolute', top: 0, width: 44, height: 38, borderRadius: 13 },
  iconWrapper: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  scannerTabItem: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // Float the button above the tab bar
    position: 'relative',
  },
  scannerGlow: { position: 'absolute', top: -4, width: 60, height: 60, borderRadius: 22 },
  scannerButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1AAF5D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});
