export type CalculationSex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type NutritionObjective = 'lose' | 'maintain' | 'gain';

export interface NutritionProfileInput {
  sex: CalculationSex;
  age: number;
  heightCm: number;
  weight: number;
  activityLevel: ActivityLevel;
  objective: NutritionObjective;
}

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const goalFactors: Record<NutritionObjective, number> = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function calculateNutritionTargets(input: NutritionProfileInput) {
  const sexOffset = input.sex === 'male' ? 5 : -161;
  const bmr = (10 * input.weight) + (6.25 * input.heightCm) - (5 * input.age) + sexOffset;
  const dailyExpenditure = bmr * activityFactors[input.activityLevel];
  const calories = Math.max(1200, roundTo(dailyExpenditure * goalFactors[input.objective], 10));

  return {
    bmr: Math.round(bmr),
    dailyExpenditure: Math.round(dailyExpenditure),
    calories,
    protein: Math.round((calories * 0.25) / 4),
    carbs: Math.round((calories * 0.45) / 4),
    fat: Math.round((calories * 0.30) / 9),
    water: roundTo(input.weight * 35, 50),
  };
}
