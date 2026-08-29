import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AppStateProvider } from '../src/context/AppStateContext';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after initialization
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            {/* Auth screens */}
            <Stack.Screen name="(auth)/onboarding" />
            <Stack.Screen name="(auth)/login" />
            
            {/* Tabs structure */}
            <Stack.Screen name="(tabs)" />

            {/* Modals */}
            <Stack.Screen 
              name="(modals)/meal-result" 
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom' 
              }} 
            />
            <Stack.Screen 
              name="(modals)/meal-edit" 
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom' 
              }} 
            />
            <Stack.Screen 
              name="(modals)/ai-chat" 
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom' 
              }} 
            />
            
            {/* Profile secondary screens */}
            <Stack.Screen name="sub-screens/edit-profile" />
            <Stack.Screen name="sub-screens/reminders" />
            <Stack.Screen name="sub-screens/devices" />
            <Stack.Screen name="sub-screens/notifications" />
          </Stack>
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
