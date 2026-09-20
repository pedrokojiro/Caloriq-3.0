import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AppStateProvider } from '../src/context/AppStateContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as SplashScreen from 'expo-splash-screen';
import { configureNotifications } from '../src/services/notifications';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after initialization
    SplashScreen.hideAsync().catch(() => {});
    configureNotifications().catch(error => console.warn('Não foi possível preparar as notificações.', error));
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedState>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            {/* Auth screens */}
            <Stack.Screen name="(auth)/onboarding" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/register" />
            <Stack.Screen name="(auth)/profile-setup" />
            
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
          </AuthenticatedState>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AuthenticatedState({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AppStateProvider key={user?.id || 'guest'}>{children}</AppStateProvider>;
}
