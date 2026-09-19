const ACTIVITY_FACTORS = Object.freeze({
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
});

const GOAL_FACTORS = Object.freeze({
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
});

const roundTo = (value, step) => Math.round(value / step) * step;

function calculateNutritionTargets({ sex, age, heightCm, weight, activityLevel, objective }) {
  const sexOffset = sex === 'male' ? 5 : -161;
  const bmr = (10 * weight) + (6.25 * heightCm) - (5 * age) + sexOffset;
  const dailyExpenditure = bmr * ACTIVITY_FACTORS[activityLevel];
  const calories = Math.max(1200, roundTo(dailyExpenditure * GOAL_FACTORS[objective], 10));

  // Distribuição inicial dentro das faixas de referência para adultos:
  // 45% carboidratos, 25% proteínas e 30% gorduras.
  const protein = Math.round((calories * 0.25) / 4);
  const carbs = Math.round((calories * 0.45) / 4);
  const fat = Math.round((calories * 0.30) / 9);
  const water = roundTo(weight * 35, 50);

  return {
    bmr: Math.round(bmr),
    dailyExpenditure: Math.round(dailyExpenditure),
    calories,
    protein,
    carbs,
    fat,
    water,
  };
}

function validateProfile(data) {
  const profile = {
    sex: String(data.sex || ''),
    age: Number(data.age),
    heightCm: Number(data.heightCm),
    weight: Number(data.weight),
    activityLevel: String(data.activityLevel || ''),
    objective: String(data.objective || ''),
  };

  if (!['female', 'male'].includes(profile.sex)) return { error: 'Selecione o sexo usado no cálculo metabólico.' };
  if (!Number.isInteger(profile.age) || profile.age < 18 || profile.age > 100) return { error: 'Informe uma idade entre 18 e 100 anos.' };
  if (!Number.isFinite(profile.heightCm) || profile.heightCm < 120 || profile.heightCm > 230) return { error: 'Informe uma altura entre 120 e 230 cm.' };
  if (!Number.isFinite(profile.weight) || profile.weight < 30 || profile.weight > 350) return { error: 'Informe um peso entre 30 e 350 kg.' };
  if (!Object.hasOwn(ACTIVITY_FACTORS, profile.activityLevel)) return { error: 'Selecione um nível de atividade.' };
  if (!Object.hasOwn(GOAL_FACTORS, profile.objective)) return { error: 'Selecione um objetivo.' };
  return { profile };
}

module.exports = { ACTIVITY_FACTORS, GOAL_FACTORS, calculateNutritionTargets, validateProfile };
