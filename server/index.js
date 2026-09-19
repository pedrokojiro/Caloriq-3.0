require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
const { pool } = require('./db');
const { normalizeEmail, validEmail, hashPassword, verifyPassword, createSessionToken, hashToken, sessionExpiry } = require('./auth');
const { GeminiProxyError, generateContent } = require('./gemini');
const { calculateNutritionTargets, validateProfile } = require('./nutrition');

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3333);

app.use(cors());
app.use(express.json({ limit: '12mb' }));

async function issueSession(client, userId) {
  const token = createSessionToken();
  await client.query('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, sessionExpiry()]);
  return token;
}

app.post('/api/auth/register', async (request, response, next) => {
  const body = request.body || {};
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (name.length < 2 || name.length > 120) return response.status(400).json({ error: 'Informe um nome válido.' });
  if (!validEmail(email)) return response.status(400).json({ error: 'Informe um e-mail válido.' });
  if (password.length < 8 || password.length > 128) return response.status(400).json({ error: 'A senha deve ter entre 8 e 128 caracteres.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = randomUUID();
    const avatarText = Array.from(name)[0].toUpperCase();
    await client.query(`INSERT INTO users (id, name, email, password_hash, weight, avatar_text, streak, onboarding_completed)
      VALUES ($1,$2,$3,$4,70,$5,0,FALSE)`, [id, name, email, hashPassword(password), avatarText]);
    await client.query(`INSERT INTO nutrition_goals (user_id, calories, protein, carbs, fat, water)
      VALUES ($1,2000,150,200,65,2500)`, [id]);
    const token = await issueSession(client, id);
    await client.query('COMMIT');
    response.status(201).json({ token, user: { id, name, email, onboardingCompleted: false } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return response.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    next(error);
  } finally { client.release(); }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const body = request.body || {};
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const result = await pool.query('SELECT id, name, email, password_hash, onboarding_completed FROM users WHERE LOWER(email) = $1', [email]);
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return response.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    const token = await issueSession(pool, user.id);
    response.json({ token, user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: user.onboarding_completed } });
  } catch (error) { next(error); }
});

async function authenticate(request, response, next) {
  try {
    const [scheme, token] = String(request.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return response.status(401).json({ error: 'Faça login para continuar.' });
    const result = await pool.query(`SELECT s.user_id, u.name, u.email, u.onboarding_completed FROM auth_sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [hashToken(token)]);
    if (!result.rowCount) return response.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    request.userId = result.rows[0].user_id;
    request.authTokenHash = hashToken(token);
    request.authUser = result.rows[0];
    next();
  } catch (error) { next(error); }
}

const number = (value) => Number(value);
const mealFromRows = (meal, items) => ({
  id: meal.id,
  name: meal.name,
  type: meal.type,
  calories: number(meal.calories),
  protein: number(meal.protein),
  carbs: number(meal.carbs),
  fat: number(meal.fat),
  portions: number(meal.portions),
  emoji: meal.emoji,
  confidence: number(meal.confidence),
  insights: meal.insights || undefined,
  consumedAt: new Date(meal.consumed_at).toISOString(),
  time: new Date(meal.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  items: items.filter(item => item.meal_id === meal.id).map(item => ({
    id: item.id, name: item.name, amount: item.amount,
    calories: number(item.calories), protein: number(item.protein), carbs: number(item.carbs), fat: number(item.fat),
  })),
});

app.get('/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) { next(error); }
});

app.use('/api', authenticate);

app.get('/api/auth/me', (request, response) => {
  response.json({ user: { id: request.userId, name: request.authUser.name, email: request.authUser.email,
    onboardingCompleted: request.authUser.onboarding_completed } });
});

app.post('/api/auth/logout', async (request, response, next) => {
  try {
    await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [request.authTokenHash]);
    response.status(204).end();
  } catch (error) { next(error); }
});

app.put('/api/onboarding', async (request, response, next) => {
  const validation = validateProfile(request.body || {});
  if (validation.error) return response.status(400).json({ error: validation.error });
  const profile = validation.profile;
  const goals = calculateNutritionTargets(profile);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `UPDATE users SET weight = $2, age = $3, height_cm = $4, calculation_sex = $5,
       activity_level = $6, objective = $7, onboarding_completed = TRUE, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, email`,
      [request.userId, profile.weight, profile.age, profile.heightCm, profile.sex, profile.activityLevel, profile.objective]
    );
    await client.query(
      `INSERT INTO nutrition_goals (user_id, calories, protein, carbs, fat, water)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET calories = EXCLUDED.calories, protein = EXCLUDED.protein,
       carbs = EXCLUDED.carbs, fat = EXCLUDED.fat, water = EXCLUDED.water, updated_at = NOW()`,
      [request.userId, goals.calories, goals.protein, goals.carbs, goals.fat, goals.water]
    );
    await client.query('COMMIT');
    const user = userResult.rows[0];
    response.json({
      user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: true },
      profile: { ...profile, bmr: goals.bmr, dailyExpenditure: goals.dailyExpenditure },
      goals: { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat, water: goals.water },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

app.post('/api/ai/generate', async (request, response, next) => {
  try {
    response.set('Cache-Control', 'no-store');
    response.json(await generateContent(request.body));
  } catch (error) {
    if (error instanceof GeminiProxyError) {
      return response.status(error.status).json({ error: error.message, code: error.code });
    }
    next(error);
  }
});

app.get('/api/diagnostics/database', async (_request, response) => {
  response.set('Cache-Control', 'no-store');
  const started = Date.now();
  try {
    const result = await pool.query({
      text: `SELECT current_database() AS name,
        (SELECT COUNT(*)::int FROM meals WHERE user_id = $1) AS meals,
        (SELECT COUNT(*)::int FROM meal_items i JOIN meals m ON m.id = i.meal_id WHERE m.user_id = $1) AS items,
        (SELECT COUNT(*)::int FROM water_entries WHERE user_id = $1) AS water_entries`,
      values: [_request.userId],
      query_timeout: 5000,
    });
    const row = result.rows[0];
    response.json({ api: 'connected', database: 'connected', databaseName: row.name,
      checkedAt: new Date().toISOString(), latencyMs: Date.now() - started,
      counts: { meals: row.meals, items: row.items, waterEntries: row.water_entries } });
  } catch {
    response.json({ api: 'connected', database: 'unavailable', databaseName: null,
      checkedAt: new Date().toISOString(), latencyMs: Date.now() - started, counts: null });
  }
});

app.get('/api/state', async (_request, response, next) => {
  try {
    const userId = _request.userId;
    const [profileResult, goalsResult, mealsResult, itemsResult, waterResult] = await Promise.all([
      pool.query(`SELECT name, streak, weight, avatar_text, age, height_cm, calculation_sex,
        activity_level, objective, onboarding_completed FROM users WHERE id = $1`, [userId]),
      pool.query('SELECT calories, protein, carbs, fat, water FROM nutrition_goals WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM meals WHERE user_id = $1 ORDER BY consumed_at DESC', [userId]),
      pool.query('SELECT mi.* FROM meal_items mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id = $1', [userId]),
      pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM water_entries WHERE user_id = $1 AND consumed_at::date = CURRENT_DATE", [userId]),
    ]);
    const profile = profileResult.rows[0];
    const goals = goalsResult.rows[0];
    response.json({
      profile: { name: profile.name, streak: profile.streak, weight: number(profile.weight), avatarText: profile.avatar_text,
        age: profile.age, heightCm: profile.height_cm ? number(profile.height_cm) : undefined,
        calculationSex: profile.calculation_sex || undefined, activityLevel: profile.activity_level || undefined,
        objective: profile.objective || undefined, onboardingCompleted: profile.onboarding_completed },
      goals: { calories: goals.calories, protein: number(goals.protein), carbs: number(goals.carbs), fat: number(goals.fat), water: goals.water },
      meals: mealsResult.rows.map(meal => mealFromRows(meal, itemsResult.rows)),
      waterIntake: number(waterResult.rows[0].total),
    });
  } catch (error) { next(error); }
});

app.put('/api/profile', async (request, response, next) => {
  try {
    const userId = request.userId;
    const { name, streak, weight, avatarText } = request.body;
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($2, name), streak = COALESCE($3, streak), weight = COALESCE($4, weight),
       avatar_text = COALESCE($5, avatar_text), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId, name, streak, weight, avatarText]
    );
    response.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.put('/api/goals', async (request, response, next) => {
  try {
    const userId = request.userId;
    const { calories, protein, carbs, fat, water } = request.body;
    const result = await pool.query(
      `UPDATE nutrition_goals SET calories = COALESCE($2, calories), protein = COALESCE($3, protein),
       carbs = COALESCE($4, carbs), fat = COALESCE($5, fat), water = COALESCE($6, water), updated_at = NOW()
       WHERE user_id = $1 RETURNING *`, [userId, calories, protein, carbs, fat, water]
    );
    response.json(result.rows[0]);
  } catch (error) { next(error); }
});

async function saveMeal(meal, userId, replace = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (replace) await client.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [meal.id, userId]);
    await client.query(
      `INSERT INTO meals (id, user_id, name, type, calories, protein, carbs, fat, portions, emoji, confidence, insights, consumed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13::timestamptz,NOW()))`,
      [meal.id, userId, meal.name, meal.type, meal.calories, meal.protein, meal.carbs, meal.fat, meal.portions, meal.emoji, meal.confidence, meal.insights, meal.consumedAt]
    );
    for (const [index, item] of (meal.items || []).entries()) {
      await client.query(
        `INSERT INTO meal_items (id, meal_id, name, amount, calories, protein, carbs, fat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [item.id || `${meal.id}-item-${index}`, meal.id, item.name, item.amount, item.calories, item.protein, item.carbs, item.fat]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

app.post('/api/meals', async (request, response, next) => {
  try { await saveMeal(request.body, request.userId); response.status(201).json({ id: request.body.id }); } catch (error) { next(error); }
});
app.put('/api/meals/:id', async (request, response, next) => {
  try { await saveMeal({ ...request.body, id: request.params.id }, request.userId, true); response.json({ id: request.params.id }); } catch (error) { next(error); }
});
app.delete('/api/meals/:id', async (request, response, next) => {
  try { await pool.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [request.params.id, request.userId]); response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/water', async (request, response, next) => {
  try { await pool.query('INSERT INTO water_entries (user_id, amount) VALUES ($1, $2)', [request.userId, request.body.amount]); response.status(201).json({ amount: request.body.amount }); } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error?.type === 'entity.too.large') return response.status(413).json({ error: 'A foto é grande demais para análise.' });
  response.status(500).json({ error: 'Erro interno da API.' });
});

const server = app.listen(port, '0.0.0.0', (error) => {
  if (error) {
    console.error(error.code === 'EADDRINUSE'
      ? `A porta ${port} já está ocupada. Encerre a execução anterior da API/apresentar com Ctrl+C e tente novamente. Nenhuma porta alternativa será usada.`
      : `Não foi possível abrir a API na porta ${port}. Confira as permissões de rede.`);
    process.exit(1);
    return;
  }
  const actualPort = server.address().port;
  console.log(`API Caloriq disponível em http://localhost:${actualPort}`);
  if (process.send) process.send({ type: 'ready', port: actualPort });
});
