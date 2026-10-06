// Utilitários compartilhados pelos testes de rota. Não é carregado pela API.
const { hashToken } = require('./auth');

// Pool falso: `handler(sql, params, session)` decide a resposta de cada consulta.
// A consulta de sessão é respondida automaticamente para os tokens de `users`.
// Cada `connect()` recebe uma sessão própria, usada para simular transações.
function fakePool(handler, users = {}) {
  let nextSession = 0;
  const makeQuery = (session) => async (sqlOrConfig, maybeParams) => {
    const sql = typeof sqlOrConfig === 'string' ? sqlOrConfig : sqlOrConfig.text;
    const params = typeof sqlOrConfig === 'string' ? (maybeParams || []) : (sqlOrConfig.values || []);
    if (/FROM auth_sessions s\s+JOIN users u/.test(sql)) {
      const entry = Object.entries(users).find(([token]) => hashToken(token) === params[0]);
      if (!entry) return { rows: [], rowCount: 0 };
      const [, user] = entry;
      return { rows: [{ user_id: user.id, name: user.name || 'Teste', email: user.email || `${user.id}@teste.local`, onboarding_completed: true }], rowCount: 1 };
    }
    const result = await handler(sql, params, session);
    return result || { rows: [], rowCount: 0 };
  };
  return {
    query: makeQuery({ id: 'pool' }),
    connect: async () => ({ query: makeQuery({ id: `client-${nextSession += 1}` }), release() {} }),
  };
}

// Banco em memória com as tabelas usadas pelas rotas de refeições e água.
// Simula `FOR UPDATE` com travas por linha liberadas no COMMIT/ROLLBACK e cede
// o event loop a cada consulta para que requisições simultâneas se intercalem.
function memoryDatabase(users = {}) {
  const data = { meals: [], items: [], water: [] };
  const locks = new Map();
  let waterId = 0;

  async function lock(key, session) {
    for (;;) {
      const current = locks.get(key);
      if (!current || current.owner === session.id) break;
      await current.released;
    }
    if (locks.get(key)?.owner === session.id) return;
    let release;
    const released = new Promise(resolve => { release = resolve; });
    locks.set(key, { owner: session.id, released, release });
  }
  function unlockAll(session) {
    for (const [key, entry] of locks) {
      if (entry.owner === session.id) { locks.delete(key); entry.release(); }
    }
  }
  const rows = (list) => ({ rows: list, rowCount: list.length });

  const handler = async (sql, params, session) => {
    await new Promise(resolve => setImmediate(resolve));
    const text = sql.replace(/\s+/g, ' ').trim();
    if (/^BEGIN/.test(text)) return rows([]);
    if (/^(COMMIT|ROLLBACK)/.test(text)) { unlockAll(session); return rows([]); }

    if (/^INSERT INTO meals .* ON CONFLICT \(id\) DO NOTHING/.test(text)) {
      if (data.meals.some(meal => meal.id === params[0])) return rows([]);
      const [id, user_id, name, type, calories, protein, carbs, fat, portions, emoji, confidence, insights, consumedAt] = params;
      data.meals.push({ id, user_id, name, type, calories, protein, carbs, fat, portions, emoji, confidence, insights,
        consumed_at: consumedAt ? new Date(consumedAt) : new Date() });
      return rows([{ id }]);
    }
    if (/^SELECT user_id FROM meals WHERE id = \$1/.test(text)) {
      if (/FOR UPDATE$/.test(text)) await lock(`meal:${params[0]}`, session);
      return rows(data.meals.filter(meal => meal.id === params[0]).map(meal => ({ user_id: meal.user_id })));
    }
    if (/^UPDATE meals SET/.test(text)) {
      const meal = data.meals.find(item => item.id === params[0] && item.user_id === params[1]);
      if (!meal) return rows([]);
      Object.assign(meal, { name: params[2], type: params[3], calories: params[4], protein: params[5], carbs: params[6], fat: params[7],
        portions: params[8], emoji: params[9], confidence: params[10], insights: params[11] });
      if (params[12]) meal.consumed_at = new Date(params[12]);
      return rows([meal]);
    }
    if (/^DELETE FROM meal_items WHERE meal_id = \$1/.test(text)) {
      data.items = data.items.filter(item => item.meal_id !== params[0]);
      return rows([]);
    }
    if (/^INSERT INTO meal_items/.test(text)) {
      if (data.items.some(item => item.id === params[0])) throw Object.assign(new Error('duplicate key'), { code: '23505' });
      const [id, meal_id, name, amount, calories, protein, carbs, fat] = params;
      data.items.push({ id, meal_id, name, amount, calories, protein, carbs, fat });
      return rows([]);
    }
    if (/^DELETE FROM meals WHERE id = \$1 AND user_id = \$2/.test(text)) {
      const removed = data.meals.filter(meal => meal.id === params[0] && meal.user_id === params[1]);
      data.meals = data.meals.filter(meal => !removed.includes(meal));
      data.items = data.items.filter(item => !removed.some(meal => meal.id === item.meal_id));
      return rows([]);
    }
    const ownMeals = () => data.meals.filter(meal => meal.user_id === params[0] && (params[1] === undefined || meal.consumed_at >= params[1]));
    if (/^SELECT \* FROM meals WHERE user_id = \$1/.test(text)) {
      return rows(ownMeals().sort((a, b) => b.consumed_at - a.consumed_at));
    }
    if (/^SELECT mi\.\* FROM meal_items mi JOIN meals m/.test(text)) {
      const ids = new Set(ownMeals().map(meal => meal.id));
      return rows(data.items.filter(item => ids.has(item.meal_id)));
    }
    if (/AT TIME ZONE \$4\)::date.* FROM meals WHERE user_id = \$1/.test(text)) {
      const [userId, from, to, timeZone] = params;
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
      const days = new Map();
      for (const meal of data.meals) {
        if (meal.user_id !== userId || meal.consumed_at < from || meal.consumed_at >= to) continue;
        const day = localDate.format(meal.consumed_at);
        const totals = days.get(day) || { day, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
        for (const field of ['calories', 'protein', 'carbs', 'fat']) totals[field] += meal[field] * meal.portions;
        totals.meals += 1;
        days.set(day, totals);
      }
      return rows([...days.values()].sort((a, b) => a.day.localeCompare(b.day)));
    }
    if (/^SELECT id FROM users WHERE id = \$1 FOR UPDATE/.test(text)) {
      await lock(`user:${params[0]}`, session);
      return rows([{ id: params[0] }]);
    }
    if (/SUM\(amount\).* FROM water_entries/.test(text)) {
      const [userId, start, end] = params;
      const total = data.water.filter(entry => entry.user_id === userId && entry.consumed_at >= start && entry.consumed_at < end)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return rows([{ total: String(total) }]);
    }
    if (/^INSERT INTO water_entries/.test(text)) {
      data.water.push({ id: waterId += 1, user_id: params[0], amount: params[1], consumed_at: new Date() });
      return rows([]);
    }
    if (/FROM users WHERE id = \$1/.test(text)) {
      return rows([{ name: 'Teste', streak: 0, weight: '70', avatar_text: 'T', onboarding_completed: true }]);
    }
    if (/FROM nutrition_goals WHERE user_id = \$1/.test(text)) {
      return rows([{ calories: 2000, protein: '150', carbs: '200', fat: '65', water: 2500 }]);
    }
    throw new Error(`SQL não simulado: ${text.slice(0, 80)}`);
  };

  return { pool: fakePool(handler, users), data };
}

async function startServer(app) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, { token, body, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined };
  };
  return { call, close: () => new Promise(resolve => server.close(resolve)) };
}

module.exports = { fakePool, memoryDatabase, startServer };
