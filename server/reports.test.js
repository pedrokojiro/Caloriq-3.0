const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { fakePool, startServer } = require('./test-helpers');

const MEALS = {
  'user-a': [
    { id: 'm1', name: 'Pão com ovo', type: 'Café da manhã', portions: '1', calories: '320', protein: '18', carbs: '30', fat: '12', day: '2026-10-18', time: '07:40' },
    { id: 'm2', name: 'Arroz e frango', type: 'Almoço', portions: '2', calories: '400', protein: '30', carbs: '45', fat: '9', day: '2026-10-18', time: '12:30' },
    { id: 'm3', name: 'Iogurte', type: 'Lanche', portions: '1', calories: '150', protein: '10', carbs: '20', fat: '3', day: '2026-10-19', time: '16:05' },
  ],
  'user-b': [{ id: 'mb', name: 'Outra conta', type: 'Jantar', portions: '1', calories: '999', protein: '1', carbs: '1', fat: '1', day: '2026-10-18', time: '20:00' }],
};

async function setup() {
  const seen = [];
  const handler = (sql, params) => {
    const text = sql.replace(/\s+/g, ' ').trim();
    seen.push({ text, params });
    if (/FROM nutrition_goals/.test(text)) return { rows: [{ calories: 2000, protein: '120', carbs: '230', fat: '65', water: 2500 }], rowCount: 1 };
    if (/^SELECT id, name, type, portions/.test(text)) { const rows = MEALS[params[0]] || []; return { rows, rowCount: rows.length }; }
    if (/^SELECT mi.meal_id/.test(text)) {
      const rows = params[0] === 'user-a' ? [{ meal_id: 'm2', name: 'Arroz', amount: '150 g', calories: '200', protein: '4', carbs: '44', fat: '1' }] : [];
      return { rows, rowCount: rows.length };
    }
    throw new Error(`SQL não simulado: ${text.slice(0, 60)}`);
  };
  const server = await startServer(createApp({ pool: fakePool(handler, { 'token-a': { id: 'user-a' } }), trustProxy: false }));
  return { server, seen };
}

const query = (tz = 'America/Sao_Paulo') => `/api/reports?from=${encodeURIComponent('2026-10-13T03:00:00.000Z')}&to=${encodeURIComponent('2026-10-20T03:00:00.000Z')}&tz=${encodeURIComponent(tz)}`;

test('relatório soma porções por dia e calcula médias e dias dentro da meta', async () => {
  const { server, seen } = await setup();
  try {
    const result = await server.call('GET', query(), { token: 'token-a' });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.days, [
      { date: '2026-10-18', calories: 1120, protein: 78, carbs: 120, fat: 30, meals: 2 },
      { date: '2026-10-19', calories: 150, protein: 10, carbs: 20, fat: 3, meals: 1 },
    ]);
    assert.equal(result.body.meals[1].calories, 800, 'porções multiplicam os valores');
    assert.equal(result.body.meals[1].items[0].name, 'Arroz');
    assert.deepEqual(result.body.summary, { daysWithMeals: 2, meals: 3, averages: { calories: 635, protein: 44, carbs: 70, fat: 16.5 }, daysWithinGoal: 0 });
    assert.equal(result.body.goals.calories, 2000);
    const mealsQuery = seen.find(entry => /^SELECT id, name, type/.test(entry.text));
    assert.equal(mealsQuery.params[0], 'user-a', 'consulta restrita ao usuário autenticado');
    assert.equal(mealsQuery.params[3], 'America/Sao_Paulo', 'agrupa no fuso enviado pelo aparelho');
  } finally { await server.close(); }
});

test('relatório valida período e fuso e exige login', async () => {
  const { server } = await setup();
  try {
    assert.equal((await server.call('GET', query())).status, 401);
    assert.equal((await server.call('GET', query('Fuso/Errado'), { token: 'token-a' })).status, 400);
    assert.equal((await server.call('GET', '/api/reports?from=2024-01-01T00:00:00Z&to=2026-10-01T00:00:00Z&tz=UTC', { token: 'token-a' })).status, 400);
  } finally { await server.close(); }
});
