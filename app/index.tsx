import React from 'react';
import { Redirect } from 'expo-router';

export default function IndexRedirect() {
  // Automatically redirect root landing to onboarding screen
  return <Redirect href="/(auth)/onboarding" />;
}
