import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { readSettings } from './local-settings';
import type { AppState, Meal, NutritionGoals, UserProfile } from '../types';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoHost = Constants.expoConfig?.hostUri;
const hostUri = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.hostname : expoHost;
let host = fallbackHost;
if (hostUri) {
  try { host = new URL(`http://${hostUri}`).hostname; } catch { /* Keep the emulator fallback. */ }
}
const apiPort = process.env.EXPO_PUBLIC_API_PORT || '3333';
const API_URL = (configuredUrl && configuredUrl !== 'auto' ? configuredUrl : `http://${host}:${apiPort}`).replace(/\/$/, '');
export const getApiUrl = async () => (await readSettings()).apiUrl || API_URL;

export interface DatabaseDiagnostics {
  api: 'connected';
  database: 'connected' | 'unavailable';
  databaseName: string | null;
  checkedAt: string;
  latencyMs: number;
  counts: { meals: number; items: number; waterEntries: number } | null;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${await getApiUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(`API local respondeu com status ${response.status}.`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const caloriqApi = {
  getDatabaseDiagnostics: (signal: AbortSignal) => request<DatabaseDiagnostics>('/api/diagnostics/database', { signal, cache: 'no-store' }),
  getState: () => request<AppState>('/api/state'),
  updateProfile: (profile: Partial<UserProfile>) => request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  updateGoals: (goals: Partial<NutritionGoals>) => request('/api/goals', { method: 'PUT', body: JSON.stringify(goals) }),
  createMeal: (meal: Meal) => request('/api/meals', { method: 'POST', body: JSON.stringify(meal) }),
  updateMeal: (meal: Meal) => request(`/api/meals/${encodeURIComponent(meal.id)}`, { method: 'PUT', body: JSON.stringify(meal) }),
  deleteMeal: (mealId: string) => request(`/api/meals/${encodeURIComponent(mealId)}`, { method: 'DELETE' }),
  addWater: (amount: number) => request('/api/water', { method: 'POST', body: JSON.stringify({ amount }) }),
};
