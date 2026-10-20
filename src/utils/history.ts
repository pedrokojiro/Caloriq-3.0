import type { Meal } from '../types';

// O app mantém em memória só as refeições recentes; dias anteriores chegam
// já agregados por /api/meals/daily-totals.
export const RECENT_MEAL_DAYS = 7;
// Cobre o maior período do Analytics (3 meses) e o período anterior usado na tendência.
export const ANALYTICS_HISTORY_DAYS = 200;
export const HISTORY_PAGE_DAYS = 400;

export type Totals = { calories: number; protein: number; carbs: number; fat: number };
export type DailyTotals = Totals & { key: string; date: Date; meals: number };
export interface ServerDailyTotals extends Totals { date: string; meals: number }

export const zeroTotals = (): Totals => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const recentMealsSince = (now = new Date()) => addDays(startOfDay(now), -(RECENT_MEAL_DAYS - 1));

export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  } catch { /* Usa o deslocamento abaixo. */ }
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (!Number.isInteger(offsetHours) || offsetHours === 0) return 'UTC';
  // Os nomes Etc/GMT usam o sinal invertido: UTC-3 é Etc/GMT+3.
  return `Etc/GMT${offsetHours > 0 ? '-' : '+'}${Math.abs(offsetHours)}`;
}

export function buildDailyTotals(meals: Meal[], since?: Date) {
  const days = new Map<string, DailyTotals>();
  meals.forEach(meal => {
    if (!meal.consumedAt) return;
    const consumedAt = new Date(meal.consumedAt);
    if (Number.isNaN(consumedAt.getTime()) || (since && consumedAt < since)) return;
    const date = startOfDay(consumedAt);
    const key = dateKey(date);
    const current = days.get(key) || { ...zeroTotals(), key, date, meals: 0 };
    const portions = Number.isFinite(meal.portions) ? meal.portions : 1;
    current.calories += meal.calories * portions;
    current.protein += meal.protein * portions;
    current.carbs += meal.carbs * portions;
    current.fat += meal.fat * portions;
    current.meals += 1;
    days.set(key, current);
  });
  return days;
}

export function fromServerDay(day: ServerDailyTotals): DailyTotals {
  const [year, month, dayOfMonth] = day.date.split('-').map(Number);
  const date = new Date(year, month - 1, dayOfMonth);
  return { key: dateKey(date), date, calories: day.calories, protein: day.protein, carbs: day.carbs, fat: day.fat, meals: day.meals };
}

// Dias recentes vêm das refeições em memória (incluindo gravações otimistas);
// os anteriores vêm do servidor.
export function mergeDailyTotals(serverDays: Map<string, DailyTotals>, localDays: Map<string, DailyTotals>, recentSince: Date) {
  const merged = new Map<string, DailyTotals>();
  for (const [key, day] of serverDays) if (day.date < recentSince) merged.set(key, day);
  for (const [key, day] of localDays) merged.set(key, day);
  return merged;
}

export function currentStreak(days: Map<string, DailyTotals>, today: Date) {
  let cursor = startOfDay(today);
  if (!days.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Indica se a sequência atual chega ao primeiro dia já carregado, ou seja,
// se é preciso buscar dias mais antigos para saber onde ela começa.
export function streakReaches(days: Map<string, DailyTotals>, today: Date, earliestLoaded: Date) {
  const streak = currentStreak(days, today);
  if (!streak) return false;
  const start = startOfDay(today);
  const first = days.has(dateKey(start)) ? addDays(start, -(streak - 1)) : addDays(start, -streak);
  return dateKey(first) === dateKey(startOfDay(earliestLoaded));
}
