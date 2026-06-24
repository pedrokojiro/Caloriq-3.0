import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  const { colors, globalColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={({ state, descriptors, navigation }) => {
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
              const { options } = descriptors[route.key];
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
                  <Pressable
                    key={route.key}
                    onPress={onPress}
                    style={styles.scannerTabItem}
                  >
                    <LinearGradient
                      colors={[globalColors.primaryGlow, globalColors.primaryDark]}
                      style={styles.scannerButton}
                    >
                      <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
                    </LinearGradient>
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: isFocused ? globalColors.primary : colors.textLight, marginTop: 4 },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.tabItem}
                >
                  <View style={[styles.iconWrapper, isFocused && { backgroundColor: `${globalColors.primary}10`, borderRadius: 12 }]}>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isFocused ? globalColors.primary : colors.textLight}
                    />
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? globalColors.primary : colors.textLight },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
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
  },
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
  },
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
