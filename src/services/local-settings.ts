import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalSettings = { geminiKey: string; apiUrl: string };
const storageKey = 'caloriq.connection-settings.v1';
const listeners = new Set<() => void>();
export const subscribeSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export async function readSettings(): Promise<LocalSettings> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return { geminiKey: '', apiUrl: '' };
  const value = JSON.parse(raw);
  return { geminiKey: typeof value.geminiKey === 'string' ? value.geminiKey : '', apiUrl: typeof value.apiUrl === 'string' ? value.apiUrl : '' };
}
export async function saveSettings(value: LocalSettings) {
  const geminiKey = value.geminiKey.trim();
  const apiUrl = value.apiUrl.trim().replace(/\/$/, '');
  if (geminiKey && !/^[A-Za-z0-9_.-]{20,}$/.test(geminiKey)) throw new Error('Confira a chave colada: formato inválido.');
  if (apiUrl) {
    let url: URL;
    try { url = new URL(apiUrl); } catch { throw new Error('Informe um endereço como http://192.168.1.10:3333.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Use somente http://endereço:porta, sem senha, caminho ou parâmetros.');
    }
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify({ geminiKey, apiUrl }));
  listeners.forEach(listener => listener());
}
