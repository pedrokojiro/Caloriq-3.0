import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import { Meal, UserProfile, NutritionGoals, AppState } from '../types';
import { caloriqApi } from '../services/api';
import type { ProfileUpdateInput } from '../services/api';
import { subscribeSettings } from '../services/local-settings';
import { useAuth } from './AuthContext';

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

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [goals, setGoals] = useState<NutritionGoals>(initialGoals);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntake, setWaterIntake] = useState(0);
  const waterIntakeRef = useRef(0);
  const [activeDayKey, setActiveDayKey] = useState(() => localDayKey());
  const activeDayRef = useRef(activeDayKey);
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => subscribeSettings(() => setSettingsVersion(value => value + 1)), []);

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
    if (!user) return;
    let active = true;
    caloriqApi.getState()
      .then(serverState => {
        if (!active) return;
        setProfile(serverState.profile);
        setGoals(serverState.goals);
        setMeals(serverState.meals);
        waterIntakeRef.current = Math.max(0, serverState.waterIntake);
        setWaterIntake(waterIntakeRef.current);
      })
      .catch(error => console.warn('Os dados da conta não puderam ser carregados.', error));
    return () => { active = false; };
  }, [activeDayKey, settingsVersion, user]);

  const addMeal = (mealData: Omit<Meal, 'id' | 'time'>): Meal => {
    const now = new Date();
    const meal: Meal = {
      ...mealData,
      id: `meal-${Date.now()}`,
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      consumedAt: now.toISOString(),
    };
    setMeals(current => [meal, ...current]);
    void caloriqApi.createMeal(meal).catch(error => console.warn('Não foi possível salvar a refeição no PostgreSQL.', error));
    return meal;
  };

  const updateMeal = (meal: Meal) => {
    setMeals(current => current.map(item => item.id === meal.id ? meal : item));
    void caloriqApi.updateMeal(meal).catch(error => console.warn('Não foi possível atualizar a refeição no PostgreSQL.', error));
  };

  const deleteMeal = (mealId: string) => {
    setMeals(current => current.filter(meal => meal.id !== mealId));
    void caloriqApi.deleteMeal(mealId).catch(error => console.warn('Não foi possível excluir a refeição no PostgreSQL.', error));
  };

  const addWater = (amount: number) => {
    const next = Math.max(0, waterIntakeRef.current + amount);
    const appliedAmount = next - waterIntakeRef.current;
    if (appliedAmount === 0) return;
    waterIntakeRef.current = next;
    setWaterIntake(next);
    void caloriqApi.addWater(appliedAmount).catch(error => console.warn('Não foi possível registrar a água no PostgreSQL.', error));
  };

  const updateGoals = (newGoals: Partial<NutritionGoals>) => {
    setGoals(current => ({ ...current, ...newGoals }));
    void caloriqApi.updateGoals(newGoals).catch(error => console.warn('Não foi possível atualizar as metas no PostgreSQL.', error));
  };

  const updateProfile = async (newProfile: ProfileUpdateInput) => {
    try {
      const saved = await caloriqApi.updateProfile(newProfile);
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
