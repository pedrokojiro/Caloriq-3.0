import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ApiError, caloriqApi } from './api';

export type ProgressPhotoAngle = 'front' | 'side' | 'back';
export interface ProgressPhoto {
  id: string;
  uri: string;
  createdAt: string;
  weight?: number;
  angle: ProgressPhotoAngle;
  source: 'local' | 'cloud';
}

const STORAGE_KEY = '@caloriq/progress-photos';
const CLOUD_KEY = '@caloriq/progress-photos-cloud';
const DIRECTORY = `${FileSystem.documentDirectory}progress-photos/`;

// ---------- preferência ----------
// O envio para a nuvem é opcional: fotos do corpo são dados sensíveis.
export async function isCloudBackupEnabled() {
  return (await AsyncStorage.getItem(CLOUD_KEY)) === 'true';
}
export async function setCloudBackupEnabled(enabled: boolean) {
  await AsyncStorage.setItem(CLOUD_KEY, enabled ? 'true' : 'false');
}

// ---------- aparelho ----------
async function readLocalPhotos(): Promise<ProgressPhoto[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as ProgressPhoto[];
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && item?.uri && item?.createdAt).map(item => ({ ...item, source: 'local' as const })) : [];
  } catch { return []; }
}

async function writeLocalPhotos(photos: ProgressPhoto[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

async function saveLocalPhoto(sourceUri: string, angle: ProgressPhotoAngle, weight?: number): Promise<ProgressPhoto> {
  await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  const extension = sourceUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase() || 'jpg';
  const id = `progress-${Date.now()}`;
  const uri = `${DIRECTORY}${id}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: uri });
  const item: ProgressPhoto = { id, uri, angle, weight, createdAt: new Date().toISOString(), source: 'local' };
  await writeLocalPhotos([item, ...(await readLocalPhotos())]);
  return item;
}

async function deleteLocalPhoto(item: ProgressPhoto) {
  await writeLocalPhotos((await readLocalPhotos()).filter(photo => photo.id !== item.id));
  await FileSystem.deleteAsync(item.uri, { idempotent: true });
}

// ---------- nuvem ----------
async function toBase64(uri: string) {
  if (Platform.OS !== 'web') return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadPhoto(uri: string, angle: ProgressPhotoAngle, weight?: number, takenAt?: string): Promise<ProgressPhoto> {
  const { photo } = await caloriqApi.uploadPhoto({ imageBase64: await toBase64(uri), angle, weight, takenAt });
  return { id: photo.id, uri: photo.url, angle: photo.angle, weight: photo.weight, createdAt: photo.createdAt, source: 'cloud' };
}

// Envia as fotos que ainda estão só no aparelho e apaga a cópia local depois do envio.
export async function syncLocalPhotosToCloud() {
  let uploaded = 0;
  for (const photo of await readLocalPhotos()) {
    await uploadPhoto(photo.uri, photo.angle, photo.weight, photo.createdAt);
    await deleteLocalPhoto(photo);
    uploaded += 1;
  }
  return uploaded;
}

export interface PhotoLibrary { photos: ProgressPhoto[]; cloudEnabled: boolean; cloudError: string | null }

export async function readProgressPhotos(): Promise<PhotoLibrary> {
  const cloudEnabled = await isCloudBackupEnabled();
  let cloud: ProgressPhoto[] = [];
  let cloudError: string | null = null;
  if (cloudEnabled) {
    try {
      await syncLocalPhotosToCloud();
      const { photos } = await caloriqApi.listPhotos();
      cloud = photos.map(photo => ({ id: photo.id, uri: photo.url, angle: photo.angle, weight: photo.weight, createdAt: photo.createdAt, source: 'cloud' as const }));
    } catch (reason) {
      cloudError = reason instanceof ApiError && reason.body?.code === 'STORAGE_DISABLED'
        ? 'A nuvem ainda não está disponível no servidor. Suas fotos continuam no aparelho.'
        : 'Sem conexão com a nuvem agora. Mostrando as fotos deste aparelho.';
    }
  }
  const photos = [...cloud, ...(await readLocalPhotos())].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { photos, cloudEnabled, cloudError };
}

export async function saveProgressPhoto(sourceUri: string, angle: ProgressPhotoAngle, weight?: number): Promise<ProgressPhoto> {
  if (await isCloudBackupEnabled()) {
    try {
      return await uploadPhoto(sourceUri, angle, weight);
    } catch {
      // Sem conexão: guarda no aparelho e envia na próxima sincronização.
    }
  }
  return saveLocalPhoto(sourceUri, angle, weight);
}

export async function deleteProgressPhoto(item: ProgressPhoto) {
  if (item.source === 'cloud') await caloriqApi.deletePhoto(item.id);
  else await deleteLocalPhoto(item);
}
