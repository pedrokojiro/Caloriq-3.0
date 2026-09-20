import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

interface ProfileAvatarProps {
  name: string;
  avatarText?: string;
  avatarUrl?: string;
  size?: number;
}

export function ProfileAvatar({ name, avatarText, avatarUrl, size = 80 }: ProfileAvatarProps) {
  const { globalColors } = useTheme();
  const fallback = (avatarText?.trim() || Array.from(name.trim() || 'U')[0] || 'U').slice(0, 2).toUpperCase();
  const sharedStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[styles.image, sharedStyle]} resizeMode="cover" />;
  }

  return (
    <LinearGradient colors={[globalColors.primaryGlow, globalColors.primary]} style={[styles.fallback, sharedStyle]}>
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{fallback}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#DDE5E0' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontWeight: '900' },
});
