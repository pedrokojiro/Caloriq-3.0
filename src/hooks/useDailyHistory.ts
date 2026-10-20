import { useEffect, useMemo, useRef, useState } from 'react';
import { caloriqApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Meal } from '../types';
import {
  ANALYTICS_HISTORY_DAYS, HISTORY_PAGE_DAYS, addDays, buildDailyTotals, dateKey, deviceTimeZone, fromServerDay,
  mergeDailyTotals, recentMealsSince, startOfDay, streakReaches, type DailyTotals,
} from '../utils/history';

const MAX_STREAK_PAGES = 10;

// Totais por dia para o Analytics: dias recentes calculados das refeições em
// memória e dias anteriores buscados já agregados no servidor.
export function useDailyHistory(meals: Meal[]) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const todayKey = dateKey(new Date());
  const recentSince = useMemo(() => recentMealsSince(new Date(`${todayKey}T12:00:00`)), [todayKey]);
  const localDays = useMemo(() => buildDailyTotals(meals, recentSince), [meals, recentSince]);
  const localDaysRef = useRef(localDays);
  const [serverDays, setServerDays] = useState<{ owner: string | null; days: Map<string, DailyTotals> }>({ owner: null, days: new Map() });

  useEffect(() => { localDaysRef.current = localDays; }, [localDays]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const today = new Date();
    const timeZone = deviceTimeZone();
    const collected = new Map<string, DailyTotals>();

    (async () => {
      let end = recentSince;
      let start = addDays(startOfDay(today), -ANALYTICS_HISTORY_DAYS);
      for (let page = 0; page < MAX_STREAK_PAGES && start < end; page += 1) {
        const { days } = await caloriqApi.getDailyTotals(start.toISOString(), end.toISOString(), timeZone);
        if (!active) return;
        days.forEach(day => {
          const parsed = fromServerDay(day);
          collected.set(parsed.key, parsed);
        });
        const merged = mergeDailyTotals(collected, localDaysRef.current, recentSince);
        if (!streakReaches(merged, today, start)) break;
        end = start;
        start = addDays(start, -HISTORY_PAGE_DAYS);
      }
      setServerDays({ owner: userId, days: collected });
    })().catch(error => console.warn('Não foi possível carregar o histórico.', error));

    return () => { active = false; };
  }, [userId, recentSince]);

  const ownServerDays = serverDays.owner === userId ? serverDays.days : null;
  const dailyMap = useMemo(
    () => mergeDailyTotals(ownServerDays ?? new Map(), localDays, recentSince),
    [ownServerDays, localDays, recentSince],
  );
  return { dailyMap, loadingHistory: ownServerDays === null };
}
