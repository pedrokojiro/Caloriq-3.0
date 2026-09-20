import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { readSettings } from './local-settings';
import { readAuthToken } from './auth-storage';
import type { AppState, Meal, NutritionGoals, UserProfile } from '../types';
import type { NutritionProfileInput } from '../utils/nutrition';

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

const currentLocalDayBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
};

export interface DatabaseDiagnostics {
  api: 'connected';
  database: 'connected' | 'unavailable';
  databaseName: string | null;
  checkedAt: string;
  latencyMs: number;
  counts: { meals: number; items: number; waterEntries: number } | null;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = await readAuthToken();
  const response = await fetch(`${await getApiUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `API local respondeu com status ${response.status}.`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const caloriqApi = {
  register: (data: { name: string; email: string; password: string }) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getCurrentUser: () => request<{ user: AuthUser }>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  completeOnboarding: (profile: NutritionProfileInput) => request<OnboardingResponse>('/api/onboarding', { method: 'PUT', body: JSON.stringify(profile) }),
  getDatabaseDiagnostics: (signal: AbortSignal) => request<DatabaseDiagnostics>('/api/diagnostics/database', { signal, cache: 'no-store' }),
  getState: () => {
    const { dayStart, dayEnd } = currentLocalDayBounds();
    return request<AppState>(`/api/state?dayStart=${encodeURIComponent(dayStart)}&dayEnd=${encodeURIComponent(dayEnd)}`);
  },
  updateProfile: (profile: ProfileUpdateInput) => request<ProfileUpdateResponse>('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  updateGoals: (goals: Partial<NutritionGoals>) => request('/api/goals', { method: 'PUT', body: JSON.stringify(goals) }),
  createMeal: (meal: Meal) => request('/api/meals', { method: 'POST', body: JSON.stringify(meal) }),
  updateMeal: (meal: Meal) => request(`/api/meals/${encodeURIComponent(meal.id)}`, { method: 'PUT', body: JSON.stringify(meal) }),
  deleteMeal: (mealId: string) => request(`/api/meals/${encodeURIComponent(mealId)}`, { method: 'DELETE' }),
  addWater: (amount: number) => request('/api/water', { method: 'POST', body: JSON.stringify({ amount }) }),
};

export interface AuthUser { id: string; name: string; email: string; onboardingCompleted: boolean }
export interface AuthResponse { token: string; user: AuthUser }
export interface OnboardingResponse {
  user: AuthUser;
  profile: NutritionProfileInput & { bmr: number; dailyExpenditure: number };
  goals: NutritionGoals;
}
export type ProfileUpdateInput = Omit<Partial<UserProfile>, 'avatarUrl'> & { avatarUrl?: string | null; recalculateGoals?: boolean };
export interface ProfileUpdateResponse { profile: UserProfile; goals?: NutritionGoals }
