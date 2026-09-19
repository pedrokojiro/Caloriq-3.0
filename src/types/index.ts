export interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: string;
}

export type MealType = 'Café da manhã' | 'Almoço' | 'Jantar' | 'Lanche';

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portions: number;
  emoji: string;
  time: string;
  consumedAt?: string;
  confidence: number; // Porcentagem de certeza da IA (ex: 94)
  items: MealItem[];
  insights?: string;
}

export interface UserProfile {
  name: string;
  streak: number;
  weight: number; // Peso atual em kg
  avatarText: string;
  age?: number;
  heightCm?: number;
  calculationSex?: 'female' | 'male';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  objective?: 'lose' | 'maintain' | 'gain';
  onboardingCompleted?: boolean;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // Meta de água em ml
}

export interface AppState {
  profile: UserProfile;
  goals: NutritionGoals;
  meals: Meal[];
  waterIntake: number; // Consumo de água hoje em ml
}
