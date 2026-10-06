const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { historyRange } = require('./validation');
const { memoryDatabase, startServer } = require('./test-helpers');

const users = { 'token-a': { id: 'user-a' }, 'token-b': { id: 'user-b' } };
const meal = (id, consumedAt, calories, portions = 1) => ({
  id, name: id, type: 'Almoço', calories, protein: 10, carbs: 20, fat: 5, portions, emoji: '🍽️', confidence: 90,
  consumedAt, items: [{ name: 'Item', amount: '1', calories, protein: 10, carbs: 20, fat: 5 }],
});

async function withHistory(run) {
  const database = memoryDatabase(users);
  const server = await startServer(createApp({ pool: database.pool }));
  try {
    for (const [token, body] of [
      ['token-a', meal('antiga', '2026-06-01T15:00:00.000Z', 400)],
      ['token-a', meal('ontem-noite', '2026-10-06T02:30:00.000Z', 300, 2)], // 05/10 23:30 em São Paulo
      ['token-a', meal('hoje', '2026-10-06T15:00:00.000Z', 500)],
      ['token-b', meal('de-b', '2026-10-06T15:00:00.000Z', 999)],
    ]) assert.equal((await server.call('POST', '/api/meals', { token, body })).status, 201);
    await run(server.call);
  } finally { await server.close(); }
}

test('sem mealsSince o /api/state continua devolvendo o histórico completo', async () => {
  await withHistory(async (call) => {
    const full = await call('GET', '/api/state', { token: 'token-a' });
    assert.deepEqual(full.body.meals.map(item => item.id), ['hoje', 'ontem-noite', 'antiga']);

    const recent = await call('GET', `/api/state?mealsSince=${encodeURIComponent('2026-09-29T03:00:00.000Z')}`, { token: 'token-a' });
    assert.deepEqual(recent.body.meals.map(item => item.id), ['hoje', 'ontem-noite']);
    assert.equal(recent.body.meals[0].items.length, 1);
  });
});

test('totais diários agrupam pelo dia local, multiplicam porções e isolam usuários', async () => {
  await withHistory(async (call) => {
    const query = (tz) => `/api/meals/daily-totals?from=${encodeURIComponent('2026-05-01T00:00:00Z')}&to=${encodeURIComponent('2026-10-07T03:00:00Z')}&tz=${encodeURIComponent(tz)}`;
    const saoPaulo = await call('GET', query('America/Sao_Paulo'), { token: 'token-a' });
    assert.equal(saoPaulo.status, 200);
    assert.deepEqual(saoPaulo.body.days.map(day => [day.date, day.calories, day.meals]), [
      ['2026-06-01', 400, 1], ['2026-10-05', 600, 1], ['2026-10-06', 500, 1],
    ]);
    const utc = await call('GET', query('UTC'), { token: 'token-a' });
    assert.deepEqual(utc.body.days.map(day => [day.date, day.calories]), [['2026-06-01', 400], ['2026-10-06', 1100]]);
    const other = await call('GET', query('UTC'), { token: 'token-b' });
    assert.deepEqual(other.body.days.map(day => day.calories), [999]);
  });
});

test('período do histórico é validado', () => {
  assert.ok(historyRange({ from: '2026-01-01T00:00:00Z', to: '2026-03-01T00:00:00Z', tz: 'America/Sao_Paulo' }).from);
  assert.ok(historyRange({ from: '2024-01-01T00:00:00Z', to: '2026-03-01T00:00:00Z', tz: 'UTC' }).error, 'mais de 400 dias');
  assert.ok(historyRange({ from: '2026-03-01T00:00:00Z', to: '2026-01-01T00:00:00Z', tz: 'UTC' }).error, 'fim antes do início');
  assert.ok(historyRange({ from: '2026-01-01T00:00:00Z', to: '2026-03-01T00:00:00Z', tz: "UTC'; DROP TABLE meals;--" }).error);
  assert.ok(historyRange({ from: 'x', to: 'y', tz: 'UTC' }).error);
});
