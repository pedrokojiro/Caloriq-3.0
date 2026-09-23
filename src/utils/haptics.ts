import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticFeedback = 'light' | 'medium' | 'selection' | 'success';

export async function triggerHaptic(feedback: HapticFeedback = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (feedback === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (feedback === 'selection') {
      await Haptics.selectionAsync();
      return;
    }
    await Haptics.impactAsync(
      feedback === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch {
    // Haptics are enhancement-only and must never block an action.
  }
}

