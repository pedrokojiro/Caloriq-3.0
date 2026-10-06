import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, buildDailyTotals, currentStreak, dateKey, fromServerDay, mergeDailyTotals, recentMealsSince, streakReaches,
} from '../../src/utils/history.ts';

const today = new Date(2026, 9, 6, 15, 0);
const dayMap = (...offsets) => new Map(offsets.map(offset => {
  const date = addDays(new Date(2026, 9, 6), offset);
  return [dateKey(date), { key: dateKey(date), date, calories: 100, protein: 0, carbs: 0, fat: 0, meals: 1 }];
}));

test('dias recentes vêm das refeições locais e os antigos do servidor', () => {
  const recentSince = recentMealsSince(today);
  assert.equal(dateKey(recentSince), '2026-09-30');
  const server = new Map([
    ['2026-09-01', fromServerDay({ date: '2026-09-01', calories: 900, protein: 1, carbs: 2, fat: 3, meals: 2 })],
    ['2026-10-05', fromServerDay({ date: '2026-10-05', calories: 111, protein: 0, carbs: 0, fat: 0, meals: 1 })],
  ]);
  const local = buildDailyTotals([
    { id: 'a', consumedAt: new Date(2026, 9, 5, 20).toISOString(), calories: 300, protein: 10, carbs: 20, fat: 5, portions: 2 },
    { id: 'velha', consumedAt: new Date(2026, 8, 1, 12).toISOString(), calories: 50, protein: 0, carbs: 0, fat: 0, portions: 1 },
  ], recentSince);
  const merged = mergeDailyTotals(server, local, recentSince);
  assert.deepEqual([...merged.keys()].sort(), ['2026-09-01', '2026-10-05']);
  assert.equal(merged.get('2026-10-05').calories, 600, 'dia recente usa o valor local (com porções)');
  assert.equal(merged.get('2026-09-01').calories, 900);
  assert.equal(merged.get('2026-09-01').date.getDate(), 1, 'data do servidor vira meia-noite local');
});

test('sequência conta a partir de hoje ou de ontem', () => {
  assert.equal(currentStreak(dayMap(0, -1, -2, -4), today), 3);
  assert.equal(currentStreak(dayMap(-1, -2), today), 2);
  assert.equal(currentStreak(dayMap(-2), today), 0);
});

test('busca páginas antigas só quando a sequência chega ao primeiro dia carregado', () => {
  const earliest = addDays(new Date(2026, 9, 6), -3);
  assert.equal(streakReaches(dayMap(0, -1, -2, -3), today, earliest), true);
  assert.equal(streakReaches(dayMap(-1, -2, -3), today, earliest), true);
  assert.equal(streakReaches(dayMap(0, -1, -3), today, earliest), false);
  assert.equal(streakReaches(new Map(), today, earliest), false);
});
