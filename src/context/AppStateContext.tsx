import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, AppState as NativeAppState, Platform } from 'react-native';
import { Meal, UserProfile, NutritionGoals, AppState } from '../types';
import { ApiError, caloriqApi } from '../services/api';
import type { ProfileUpdateInput } from '../services/api';
import { subscribeSettings } from '../services/local-settings';
import { useAuth } from './AuthContext';
import { createId } from '../utils/id';
import { formatMealTime } from '../utils/time';
import {
  SyncTracker, removeOptimisticMeal, restoreDeletedMeal, revertGoals, revertMealUpdate, revertWater,
} from '../utils/optimistic';

interface AppContextProps {
  state: AppState;
  addMeal: (meal: Omit<Meal, 'id' | 'time'>) => Meal;
  updateMeal: (meal: Meal) => void;
  deleteMeal: (mealId: string) => void;
  addWater: (amount: number) => void;
  updateGoals: (goals: Partial<NutritionGoals>) => void;
  updateProfile: (profile: ProfileUpdateInput) => Promise<void>;
}

const initialProfile: UserProfile = {
  name: '',
  streak: 0,
  weight: 0,
  avatarText: '',
};

const initialGoals: NutritionGoals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  water: 0,
};

const AppStateContext = createContext<AppContextProps | undefined>(undefined);
const localDayKey = (date = new Date()) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const reportFailure = (message: string) => {
  const title = 'Não foi possível salvar';
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [goals, setGoals] = useState<NutritionGoals>(initialGoals);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntake, setWaterIntake] = useState(0);
  const waterIntakeRef = useRef(0);
  const [activeDayKey, setActiveDayKey] = useState(() => localDayKey());
  const activeDayRef = useRef(activeDayKey);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const syncRef = useRef(new SyncTracker());

  useEffect(() => subscribeSettings(() => setSettingsVersion(value => value + 1)), []);

  // Ao trocar de conta, descarta o estado anterior já na renderização e invalida
  // as respostas pendentes antes do carregamento da nova conta.
  const [stateOwner, setStateOwner] = useState(userId);
  if (stateOwner !== userId) {
    setStateOwner(userId);
    setProfile(initialProfile);
    setGoals(initialGoals);
    setMeals([]);
    setWaterIntake(0);
  }
  useLayoutEffect(() => {
    syncRef.current.reset();
    waterIntakeRef.current = 0;
  }, [userId]);

  const setWater = (next: number) => {
    waterIntakeRef.current = next;
    setWaterIntake(next);
  };

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;
    const refreshDay = () => {
      const next = localDayKey();
      if (activeDayRef.current === next) return;
      activeDayRef.current = next;
      waterIntakeRef.current = 0;
      setWaterIntake(0);
      setMeals(current => [...current]);
      setActiveDayKey(next);
    };
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      midnightTimer = setTimeout(() => {
        refreshDay();
        scheduleMidnightRefresh();
      }, tomorrow.getTime() - now.getTime());
    };
    scheduleMidnightRefresh();
    const subscription = NativeAppState.addEventListener('change', status => {
      if (status === 'active') refreshDay();
    });
    return () => {
      clearTimeout(midnightTimer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const sync = syncRef.current;
    const ticket = sync.startFetch();
    const dayKey = activeDayRef.current;
    caloriqApi.getState()
      .then(serverState => {
        if (!active) return;
        const decision = sync.resolveFetch(ticket);
        if (decision === 'reload') {
          setReloadNonce(value => value + 1);
          return;
        }
        if (decision !== 'apply' || dayKey !== activeDayRef.current) return;
        setProfile(serverState.profile);
        setGoals(serverState.goals);
        setMeals(serverState.meals);
        setWater(Math.max(0, serverState.waterIntake));
      })
      .catch(error => console.warn('Os dados da conta não puderam ser carregados.', error));
    return () => { active = false; };
  }, [activeDayKey, settingsVersion, userId, reloadNonce]);

  // Executa uma gravação otimista. `revert` desfaz somente o efeito desta
  // operação e só roda se a conta ainda for a mesma.
  const persist = (save: () => Promise<unknown>, revert: (error: unknown) => void, failureMessage: string) => {
    const sync = syncRef.current;
    const epoch = sync.beginMutation();
    save()
      .then(() => undefined, error => {
        if (!sync.isCurrent(epoch)) return;
        console.warn(failureMessage, error);
        revert(error);
        reportFailure(error instanceof ApiError && error.status < 500 && error.body?.error ? error.body.error : failureMessage);
      })
      .finally(() => {
        if (sync.settleMutation(epoch)) setReloadNonce(value => value + 1);
      });
  };

  const addMeal = (mealData: Omit<Meal, 'id' | 'time'>): Meal => {
    const now = new Date();
    const meal: Meal = {
      ...mealData,
      id: createId(),
      consumedAt: now.toISOString(),
      time: formatMealTime(now.toISOString()),
    };
    setMeals(current => [meal, ...current]);
    persist(
      () => caloriqApi.createMeal(meal),
      () => setMeals(current => removeOptimisticMeal(current, meal)),
      'Não foi possível salvar a refeição. Tente novamente.',
    );
    return meal;
  };

  const updateMeal = (meal: Meal) => {
    const previous = meals.find(item => item.id === meal.id);
    setMeals(current => current.map(item => item.id === meal.id ? meal : item));
    persist(
      () => caloriqApi.updateMeal(meal),
      () => { if (previous) setMeals(current => revertMealUpdate(current, meal, previous)); },
      'Não foi possível atualizar a refeição. Tente novamente.',
    );
  };

  const deleteMeal = (mealId: string) => {
    const index = meals.findIndex(meal => meal.id === mealId);
    const removed = meals[index];
    setMeals(current => current.filter(meal => meal.id !== mealId));
    persist(
      () => caloriqApi.deleteMeal(mealId),
      () => { if (removed) setMeals(current => restoreDeletedMeal(current, removed, index)); },
      'Não foi possível excluir a refeição. Tente novamente.',
    );
  };

  const addWater = (amount: number) => {
    const next = Math.max(0, waterIntakeRef.current + amount);
    const appliedAmount = next - waterIntakeRef.current;
    if (appliedAmount === 0) return;
    const dayKey = activeDayRef.current;
    setWater(next);
    persist(
      () => caloriqApi.addWater(appliedAmount),
      (error) => {
        if (dayKey !== activeDayRef.current) return;
        setWater(revertWater(waterIntakeRef.current, appliedAmount));
        // O servidor recusou porque o total real é menor: recarrega o valor oficial.
        if (error instanceof ApiError && error.body?.code === 'WATER_NEGATIVE') setReloadNonce(value => value + 1);
      },
      'Não foi possível registrar a água. Tente novamente.',
    );
  };

  const updateGoals = (newGoals: Partial<NutritionGoals>) => {
    const previous = goals;
    const applied = { ...newGoals };
    setGoals(current => ({ ...current, ...applied }));
    persist(
      () => caloriqApi.updateGoals(applied),
      () => setGoals(current => revertGoals(current, previous, applied)),
      'Não foi possível atualizar as metas. Tente novamente.',
    );
  };

  const updateProfile = async (newProfile: ProfileUpdateInput) => {
    const epoch = syncRef.current.epoch;
    try {
      const saved = await caloriqApi.updateProfile(newProfile);
      if (!syncRef.current.isCurrent(epoch)) return;
      setProfile(saved.profile);
      if (saved.goals) setGoals(saved.goals);
    } catch (error) {
      console.warn('Não foi possível atualizar o perfil no PostgreSQL.', error);
      throw error;
    }
  };

  return (
    <AppStateContext.Provider value={{
      state: { profile, goals, meals, waterIntake },
      addMeal,
      updateMeal,
      deleteMeal,
      addWater,
      updateGoals,
      updateProfile,
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
};
