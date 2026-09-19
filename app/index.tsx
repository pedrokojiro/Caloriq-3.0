import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function IndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  return <Redirect href={(user ? (user.onboardingCompleted ? '/(tabs)' : '/(auth)/profile-setup') : '/(auth)/onboarding') as never} />;
}
