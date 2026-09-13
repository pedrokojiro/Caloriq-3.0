import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalSettings = { apiUrl: string };
const storageKey = 'caloriq.connection-settings.v1';
const listeners = new Set<() => void>();
export const subscribeSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export async function readSettings(): Promise<LocalSettings> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return { apiUrl: '' };
  const value = JSON.parse(raw);
  return { apiUrl: typeof value.apiUrl === 'string' ? value.apiUrl : '' };
}
export async function saveSettings(value: LocalSettings) {
  const apiUrl = value.apiUrl.trim().replace(/\/$/, '');
  if (apiUrl) {
    let url: URL;
    try { url = new URL(apiUrl); } catch { throw new Error('Informe um endereço como http://192.168.1.10:3333.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Use somente http://endereço:porta, sem senha, caminho ou parâmetros.');
    }
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify({ apiUrl }));
  listeners.forEach(listener => listener());
}
