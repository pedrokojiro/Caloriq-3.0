import { Platform } from 'react-native';
import type { AppState, Meal, NutritionGoals, UserProfile } from '../types';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = (process.env.EXPO_PUBLIC_API_URL || `http://${fallbackHost}:3333`).replace(/\/$/, '');

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(`API local respondeu com status ${response.status}.`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const caloriqApi = {
  getState: () => request<AppState>('/api/state'),
  updateProfile: (profile: Partial<UserProfile>) => request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  updateGoals: (goals: Partial<NutritionGoals>) => request('/api/goals', { method: 'PUT', body: JSON.stringify(goals) }),
  createMeal: (meal: Meal) => request('/api/meals', { method: 'POST', body: JSON.stringify(meal) }),
  updateMeal: (meal: Meal) => request(`/api/meals/${encodeURIComponent(meal.id)}`, { method: 'PUT', body: JSON.stringify(meal) }),
  deleteMeal: (mealId: string) => request(`/api/meals/${encodeURIComponent(mealId)}`, { method: 'DELETE' }),
  addWater: (amount: number) => request('/api/water', { method: 'POST', body: JSON.stringify({ amount }) }),
};
