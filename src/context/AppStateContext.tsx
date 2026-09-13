import React, { createContext, useContext, useEffect, useState } from 'react';
import { Meal, UserProfile, NutritionGoals, AppState } from '../types';
import { caloriqApi } from '../services/api';
import { subscribeSettings } from '../services/local-settings';
import { useAuth } from './AuthContext';

interface AppContextProps {
  state: AppState;
  addMeal: (meal: Omit<Meal, 'id' | 'time'>) => Meal;
  updateMeal: (meal: Meal) => void;
  deleteMeal: (mealId: string) => void;
  addWater: (amount: number) => void;
  updateGoals: (goals: Partial<NutritionGoals>) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  mockScannerScan: (foodName: string) => Omit<Meal, 'id' | 'time'>;
}

const initialProfile: UserProfile = {
  name: 'Usuário',
  streak: 0,
  weight: 70,
  avatarText: 'U',
};

const initialGoals: NutritionGoals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  water: 2500,
};

const AppStateContext = createContext<AppContextProps | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [goals, setGoals] = useState<NutritionGoals>(initialGoals);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [settingsVersion, setSettingsVersion] = useState(0);
  useEffect(() => subscribeSettings(() => setSettingsVersion(value => value + 1)), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    caloriqApi.getState()
      .then((serverState) => {
        if (!active) return;
        setProfile(serverState.profile);
        setGoals(serverState.goals);
        setMeals(serverState.meals);
        setWaterIntake(serverState.waterIntake);
      })
      .catch((error) => console.warn('API local indisponível; os dados da conta não puderam ser carregados.', error));
    return () => { active = false; };
  }, [settingsVersion, user]);

  const addMeal = (newMealData: Omit<Meal, 'id' | 'time'>): Meal => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newMeal: Meal = {
      ...newMealData,
      id: `meal-${Date.now()}`,
      time: timeString,
    };
    setMeals((prevMeals) => [newMeal, ...prevMeals]);
    void caloriqApi.createMeal(newMeal).catch((error) => console.warn('Não foi possível salvar a refeição no PostgreSQL.', error));
    return newMeal;
  };

  const updateMeal = (updatedMeal: Meal) => {
    setMeals((prevMeals) =>
      prevMeals.map((meal) => (meal.id === updatedMeal.id ? updatedMeal : meal))
    );
    void caloriqApi.updateMeal(updatedMeal).catch((error) => console.warn('Não foi possível atualizar a refeição no PostgreSQL.', error));
  };

  const deleteMeal = (mealId: string) => {
    setMeals((prevMeals) => prevMeals.filter((meal) => meal.id !== mealId));
    void caloriqApi.deleteMeal(mealId).catch((error) => console.warn('Não foi possível excluir a refeição no PostgreSQL.', error));
  };

  const addWater = (amount: number) => {
    setWaterIntake((prev) => Math.max(0, prev + amount));
    void caloriqApi.addWater(amount).catch((error) => console.warn('Não foi possível registrar a água no PostgreSQL.', error));
  };

  const updateGoals = (newGoals: Partial<NutritionGoals>) => {
    setGoals((prev) => ({ ...prev, ...newGoals }));
    void caloriqApi.updateGoals(newGoals).catch((error) => console.warn('Não foi possível atualizar as metas no PostgreSQL.', error));
  };

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...newProfile }));
    void caloriqApi.updateProfile(newProfile).catch((error) => console.warn('Não foi possível atualizar o perfil no PostgreSQL.', error));
  };

  // Mock de escaneamento de alimentos com inteligência artificial
  const mockScannerScan = (foodName: string): Omit<Meal, 'id' | 'time'> => {
    const list: { [key: string]: Omit<Meal, 'id' | 'time'> } = {
      'Salada com Frango': {
        name: 'Salada com Frango Grelhado',
        type: 'Almoço',
        calories: 380,
        protein: 42,
        carbs: 18,
        fat: 12,
        portions: 1,
        emoji: '🥗',
        confidence: 94,
        items: [
          { id: '1', name: 'Frango Grelhado', calories: 220, protein: 35, carbs: 0, fat: 8, amount: '150g' },
          { id: '2', name: 'Alface e Tomate', calories: 20, protein: 1, carbs: 4, fat: 0, amount: '120g' },
          { id: '3', name: 'Azeite de Oliva', calories: 140, protein: 0, carbs: 0, fat: 15, amount: '1 colher' }
        ]
      },
      'Hambúrguer com Fritas': {
        name: 'Hambúrguer Gourmet com Fritas',
        type: 'Jantar',
        calories: 780,
        protein: 38,
        carbs: 85,
        fat: 32,
        portions: 1,
        emoji: '🍔',
        confidence: 89,
        items: [
          { id: '1', name: 'Hambúrguer de Costela', calories: 350, protein: 28, carbs: 2, fat: 22, amount: '180g' },
          { id: '2', name: 'Pão de Hambúrguer', calories: 210, protein: 6, carbs: 40, fat: 3, amount: '1 unidade' },
          { id: '3', name: 'Batatas Fritas', calories: 220, protein: 4, carbs: 43, fat: 7, amount: '100g' }
        ]
      },
      'Ovos Mexidos com Torrada': {
        name: 'Ovos Mexidos com Torrada Integral',
        type: 'Café da manhã',
        calories: 320,
        protein: 18,
        carbs: 26,
        fat: 14,
        portions: 1,
        emoji: '🍳',
        confidence: 97,
        items: [
          { id: '1', name: 'Ovo Inteiro', calories: 150, protein: 12, carbs: 1, fat: 10, amount: '2 unidades' },
          { id: '2', name: 'Pão de Forma Integral', calories: 140, protein: 5, carbs: 25, fat: 2, amount: '2 fatias' },
          { id: '3', name: 'Manteiga', calories: 30, protein: 0, carbs: 0, fat: 3.5, amount: 'Meia colher de chá' }
        ]
      },
      'Iogurte com Granola': {
        name: 'Iogurte Natural com Granola e Mel',
        type: 'Lanche',
        calories: 270,
        protein: 12,
        carbs: 38,
        fat: 6,
        portions: 1,
        emoji: '🥣',
        confidence: 93,
        items: [
          { id: '1', name: 'Iogurte Desnatado', calories: 90, protein: 8, carbs: 12, fat: 0.5, amount: '150g' },
          { id: '2', name: 'Granola Tradicional', calories: 130, protein: 3, carbs: 22, fat: 4.5, amount: '30g' },
          { id: '3', name: 'Mel de Abelha', calories: 50, protein: 0.1, carbs: 14, fat: 0, amount: '1 colher de chá' }
        ]
      },
      'Salmão com Aspargos': {
        name: 'Salmão Grelhado com Aspargos',
        type: 'Jantar',
        calories: 450,
        protein: 34,
        carbs: 8,
        fat: 28,
        portions: 1,
        emoji: '🍣',
        confidence: 95,
        items: [
          { id: '1', name: 'Filé de Salmão', calories: 310, protein: 32, carbs: 0, fat: 20, amount: '150g' },
          { id: '2', name: 'Aspargos Grelhados', calories: 40, protein: 2, carbs: 6, fat: 1, amount: '100g' },
          { id: '3', name: 'Manteiga de Ervas', calories: 100, protein: 0, carbs: 2, fat: 11, amount: '1 colher' }
        ]
      }
    };

    return list[foodName] || {
      name: foodName,
      type: 'Lanche',
      calories: 200,
      protein: 10,
      carbs: 25,
      fat: 6,
      portions: 1,
      emoji: '🍽️',
      confidence: 85,
      items: [
        { id: '1', name: foodName, calories: 200, protein: 10, carbs: 25, fat: 6, amount: '1 porção' }
      ]
    };
  };

  return (
    <AppStateContext.Provider
      value={{
        state: { profile, goals, meals, waterIntake },
        addMeal,
        updateMeal,
        deleteMeal,
        addWater,
        updateGoals,
        updateProfile,
        mockScannerScan,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
