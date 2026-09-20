import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export type ProgressPhotoAngle = 'front' | 'side' | 'back';
export interface ProgressPhoto {
  id: string;
  uri: string;
  createdAt: string;
  weight?: number;
  angle: ProgressPhotoAngle;
}

const STORAGE_KEY = '@caloriq/progress-photos';
const DIRECTORY = `${FileSystem.documentDirectory}progress-photos/`;

export async function readProgressPhotos(): Promise<ProgressPhoto[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as ProgressPhoto[];
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && item?.uri && item?.createdAt) : [];
  } catch { return []; }
}

export async function saveProgressPhoto(sourceUri: string, angle: ProgressPhotoAngle, weight?: number) {
  await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  const extension = sourceUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase() || 'jpg';
  const id = `progress-${Date.now()}`;
  const uri = `${DIRECTORY}${id}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: uri });
  const item: ProgressPhoto = { id, uri, angle, weight, createdAt: new Date().toISOString() };
  const current = await readProgressPhotos();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...current]));
  return item;
}

export async function deleteProgressPhoto(item: ProgressPhoto) {
  const current = await readProgressPhotos();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter(photo => photo.id !== item.id)));
  await FileSystem.deleteAsync(item.uri, { idempotent: true });
}
