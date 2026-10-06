const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { validateMeal, validateWaterChange, validateGoals, dayBounds } = require('./validation');
const { memoryDatabase, startServer } = require('./test-helpers');

const users = { 'token-a': { id: 'user-a' }, 'token-b': { id: 'user-b' } };
const meal = (overrides = {}) => ({
  id: 'meal-1730000000000', name: 'Arroz e feijão', type: 'Almoço', calories: 520, protein: 22, carbs: 80, fat: 9,
  portions: 1, emoji: '🍛', confidence: 92, insights: 'Boa fonte de fibras.', time: '12:30',
  consumedAt: '2026-10-06T15:30:00.000Z',
  items: [{ id: '1', name: 'Arroz', amount: '150 g', calories: 200, protein: 4, carbs: 44, fat: 0.5 }],
  ...overrides,
});

async function withServer(run) {
  const database = memoryDatabase(users);
  const server = await startServer(createApp({ pool: database.pool }));
  try { await run(server.call, database.data); } finally { await server.close(); }
}

test('validação de refeição aceita o formato dos APKs atuais e recusa valores inválidos', () => {
  const ok = validateMeal(meal());
  assert.equal(ok.error, undefined);
  assert.equal(ok.meal.items[0].id, undefined, 'id do item enviado pelo app é descartado');
  assert.ok(validateMeal(meal({ id: crypto.randomUUID() })).meal);
  for (const invalid of [
    meal({ id: '' }), meal({ id: 'a/b' }), meal({ name: '  ' }), meal({ type: 'Ceia' }), meal({ calories: -1 }),
    meal({ protein: 'muito' }), meal({ fat: Infinity }), meal({ portions: 0 }), meal({ confidence: 140 }),
    meal({ consumedAt: 'ontem' }), meal({ consumedAt: '2999-01-01T00:00:00Z' }),
    meal({ items: Array.from({ length: 51 }, () => meal().items[0]) }), meal({ items: [{ name: 'x', calories: -5, protein: 0, carbs: 0, fat: 0 }] }),
  ]) assert.ok(validateMeal(invalid).error, JSON.stringify(invalid).slice(0, 60));
});

test('validação de água aceita ajustes negativos e de metas recusa valores fora da faixa', () => {
  assert.equal(validateWaterChange({ amount: -250 }).amount, -250);
  for (const amount of [0, 0.5, 6000, -6000, '250', NaN, null]) assert.ok(validateWaterChange({ amount }).error, String(amount));
  assert.deepEqual(validateGoals({ calories: 2200, water: 3000 }).goals, { calories: 2200, water: 3000 });
  for (const goals of [{ calories: -1 }, { calories: 2200.5 }, { water: 0 }, { protein: 'x' }, null]) assert.ok(validateGoals(goals).error);
});

test('limites do dia usam os enviados pelo app e recusam intervalos absurdos', () => {
  const sent = dayBounds('2026-10-06T03:00:00.000Z', '2026-10-07T03:00:00.000Z');
  assert.equal(sent.dayStart.toISOString(), '2026-10-06T03:00:00.000Z');
  const fallback = dayBounds('2026-10-01T00:00:00Z', '2026-10-09T00:00:00Z', new Date(2026, 9, 6, 15));
  assert.equal(fallback.dayEnd - fallback.dayStart, 24 * 60 * 60 * 1000);
});

test('refeições são isoladas entre usuários', async () => {
  await withServer(async (call, data) => {
    assert.equal((await call('POST', '/api/meals', { token: 'token-a', body: meal() })).status, 201);
    assert.equal((await call('POST', '/api/meals', { token: 'token-a', body: meal() })).status, 200, 'reenvio do mesmo usuário é idempotente');

    const collision = await call('POST', '/api/meals', { token: 'token-b', body: meal({ name: 'Outra' }) });
    assert.equal(collision.status, 409);
    assert.equal(collision.body.code, 'MEAL_ID_CONFLICT');

    assert.equal((await call('PUT', `/api/meals/${meal().id}`, { token: 'token-b', body: meal({ name: 'Invadido' }) })).status, 404);
    assert.equal((await call('DELETE', `/api/meals/${meal().id}`, { token: 'token-b' })).status, 204);
    assert.equal(data.meals.length, 1);
    assert.equal(data.meals[0].name, 'Arroz e feijão', 'refeição de A não foi alterada nem apagada por B');

    const stateB = await call('GET', '/api/state', { token: 'token-b' });
    assert.deepEqual(stateB.body.meals, []);
    const stateA = await call('GET', '/api/state', { token: 'token-a' });
    assert.equal(stateA.body.meals.length, 1);
    assert.equal(stateA.body.meals[0].items.length, 1);

    // Mesmo id de item vindo de contas diferentes não colide mais.
    assert.equal((await call('POST', '/api/meals', { token: 'token-b', body: meal({ id: 'meal-b' }) })).status, 201);
    assert.equal(new Set(data.items.map(item => item.id)).size, data.items.length);
  });
});

test('editar substitui os itens e PUT de refeição inexistente a cria (APKs antigos)', async () => {
  await withServer(async (call, data) => {
    await call('POST', '/api/meals', { token: 'token-a', body: meal() });
    const edited = meal({ name: 'Prato feito', items: [
      { id: '1', name: 'Arroz', amount: '100 g', calories: 130, protein: 3, carbs: 28, fat: 0.3 },
      { id: '2', name: 'Feijão', amount: '80 g', calories: 60, protein: 4, carbs: 10, fat: 0.4 },
    ] });
    assert.equal((await call('PUT', `/api/meals/${meal().id}`, { token: 'token-a', body: edited })).status, 200);
    assert.equal(data.meals[0].name, 'Prato feito');
    assert.equal(data.items.length, 2);

    assert.equal((await call('PUT', '/api/meals/meal-nova', { token: 'token-a', body: meal({ id: 'ignorado' }) })).status, 200);
    assert.ok(data.meals.some(item => item.id === 'meal-nova' && item.user_id === 'user-a'));
    assert.equal((await call('POST', '/api/meals', { token: 'token-a', body: meal({ calories: -10, id: 'x' }) })).status, 400);
  });
});

test('ajustes simultâneos de água nunca deixam o total do dia negativo', async () => {
  await withServer(async (call, data) => {
    const now = new Date();
    const day = {
      dayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      dayEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
    };
    assert.equal((await call('POST', '/api/water', { token: 'token-a', body: { amount: 500, ...day } })).status, 201);
    assert.equal((await call('POST', '/api/water', { token: 'token-b', body: { amount: 250, ...day } })).status, 201);

    const results = await Promise.all(Array.from({ length: 6 }, () => call('POST', '/api/water', { token: 'token-a', body: { amount: -250, ...day } })));
    const accepted = results.filter(result => result.status === 201);
    const rejected = results.filter(result => result.status === 409);
    assert.equal(accepted.length, 2);
    assert.equal(rejected.length, 4);
    assert.ok(rejected.every(result => result.body.total === 0 && result.body.code === 'WATER_NEGATIVE'));

    const totalA = data.water.filter(entry => entry.user_id === 'user-a').reduce((sum, entry) => sum + entry.amount, 0);
    assert.equal(totalA, 0);
    const stateB = await call('GET', `/api/state?dayStart=${encodeURIComponent(day.dayStart)}&dayEnd=${encodeURIComponent(day.dayEnd)}`, { token: 'token-b' });
    assert.equal(stateB.body.waterIntake, 250, 'água de A não afeta B');

    assert.equal((await call('POST', '/api/water', { token: 'token-a', body: { amount: 'muito' } })).status, 400);
    assert.equal((await call('POST', '/api/water', { token: 'token-a', body: { amount: 300 } })).status, 201, 'APK antigo sem limites do dia continua funcionando');
  });
});
