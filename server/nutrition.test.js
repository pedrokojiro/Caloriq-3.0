const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateNutritionTargets, validateProfile } = require('./nutrition');

test('calcula TMB, gasto e metas para manutenção', () => {
  const result = calculateNutritionTargets({
    sex: 'male', age: 30, heightCm: 180, weight: 80,
    activityLevel: 'moderate', objective: 'maintain',
  });

  assert.deepEqual(result, {
    bmr: 1780,
    dailyExpenditure: 2759,
    calories: 2760,
    protein: 173,
    carbs: 311,
    fat: 92,
    water: 2800,
  });
});

test('aplica o objetivo de perda sem produzir meta abaixo do limite técnico', () => {
  const result = calculateNutritionTargets({
    sex: 'female', age: 30, heightCm: 180, weight: 80,
    activityLevel: 'sedentary', objective: 'lose',
  });

  assert.equal(result.bmr, 1614);
  assert.equal(result.calories, 1650);
});

test('rejeita perfil fora dos intervalos aceitos', () => {
  const result = validateProfile({
    sex: 'male', age: 14, heightCm: 180, weight: 80,
    activityLevel: 'moderate', objective: 'maintain',
  });

  assert.equal(result.error, 'Informe uma idade entre 18 e 100 anos.');
});
