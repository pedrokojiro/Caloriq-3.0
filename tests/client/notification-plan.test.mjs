import test from 'node:test';
import assert from 'node:assert/strict';
import { planNotifications } from '../../src/utils/notification-plan.ts';

const prefs = (overrides = {}) => ({
  journal: false, streak: false, weeklyReport: false, aiInsights: false, water: false, waterIntervalHours: 2,
  mealReminders: { breakfast: { enabled: false, time: null }, lunch: { enabled: false, time: null }, snack: { enabled: false, time: null }, dinner: { enabled: false, time: null } },
  ...overrides,
});
const hm = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

test('água só entre 8h e 21h, no intervalo escolhido, e nunca de madrugada', () => {
  const now = new Date(2026, 9, 19, 6, 0); // segunda, 06:00
  const plan = planNotifications(prefs({ water: true, waterIntervalHours: 3 }), now, null, 1);
  assert.deepEqual(plan.map(item => hm(item.date)), ['08:00', '11:00', '14:00', '17:00', '20:00']);
  const twoHours = planNotifications(prefs({ water: true }), now, null, 2);
  assert.ok(twoHours.every(item => item.date.getHours() >= 8 && item.date.getHours() < 21));
  assert.equal(twoHours.length, 14);
});

test('pula hoje o que já foi feito, mas mantém os próximos dias', () => {
  const now = new Date(2026, 9, 19, 9, 0);
  const plan = planNotifications(prefs({
    water: true, streak: true, journal: true,
    mealReminders: { breakfast: { enabled: true, time: '07:30' }, lunch: { enabled: true, time: '12:00' }, snack: { enabled: false, time: null }, dinner: { enabled: true, time: '19:30' } },
  }), now, { mealTypes: ['Almoço', 'Jantar'], waterIntake: 2500, waterGoal: 2500 }, 2);
  const today = plan.filter(item => item.date.getDate() === 19).map(item => item.kind);
  assert.deepEqual(today, [], 'almoço e jantar registrados, meta de água batida, sequência e diário completos; o café já passou');
  const tomorrow = plan.filter(item => item.date.getDate() === 20).map(item => item.kind);
  for (const kind of ['meal-breakfast', 'meal-lunch', 'meal-dinner', 'water', 'journal', 'streak']) assert.ok(tomorrow.includes(kind), kind);
});

test('água de hoje mostra quanto falta; relatório semanal só no domingo às 18h', () => {
  const now = new Date(2026, 9, 19, 9, 30);
  const water = planNotifications(prefs({ water: true }), now, { mealTypes: [], waterIntake: 900, waterGoal: 2100 }, 1);
  assert.equal(water[0].body, 'Faltam 1,2 L para sua meta de hoje.');
  assert.equal(hm(water[0].date), '10:00', 'horários que já passaram ficam de fora');
  const weekly = planNotifications(prefs({ weeklyReport: true }), now, null, 7);
  assert.equal(weekly.length, 1);
  assert.equal(weekly[0].date.getDay(), 0);
  assert.equal(hm(weekly[0].date), '18:00');
  assert.equal(weekly[0].url, '/(tabs)/analytics');
});

test('cada lembrete leva para a tela certa e o plano sai em ordem', () => {
  const now = new Date(2026, 9, 19, 0, 0);
  const plan = planNotifications(prefs({ aiInsights: true, streak: true, mealReminders: { breakfast: { enabled: true, time: '07:00' }, lunch: { enabled: false, time: null }, snack: { enabled: false, time: null }, dinner: { enabled: false, time: null } } }), now, null, 1);
  assert.deepEqual(plan.map(item => [item.kind, item.url]), [['meal-breakfast', '/(tabs)/scanner'], ['ai-insight', '/(modals)/ai-chat'], ['streak', '/(tabs)/scanner']]);
});
