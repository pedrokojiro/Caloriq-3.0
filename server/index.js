require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();
const port = Number(process.env.API_PORT || 3333);
const userId = 'local-user';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

app.get('/api/diagnostics/database', async (_request, response) => {
  response.set('Cache-Control', 'no-store');
  const started = Date.now();
  try {
    const result = await pool.query({
      text: `SELECT current_database() AS name,
        (SELECT COUNT(*)::int FROM meals WHERE user_id = $1) AS meals,
        (SELECT COUNT(*)::int FROM meal_items i JOIN meals m ON m.id = i.meal_id WHERE m.user_id = $1) AS items,
        (SELECT COUNT(*)::int FROM water_entries WHERE user_id = $1) AS water_entries`,
      values: [userId],
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
    const [profileResult, goalsResult, mealsResult, itemsResult, waterResult] = await Promise.all([
      pool.query('SELECT name, streak, weight, avatar_text FROM users WHERE id = $1', [userId]),
      pool.query('SELECT calories, protein, carbs, fat, water FROM nutrition_goals WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM meals WHERE user_id = $1 ORDER BY consumed_at DESC', [userId]),
      pool.query('SELECT mi.* FROM meal_items mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id = $1', [userId]),
      pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM water_entries WHERE user_id = $1 AND consumed_at::date = CURRENT_DATE", [userId]),
    ]);
    const profile = profileResult.rows[0];
    const goals = goalsResult.rows[0];
    response.json({
      profile: { name: profile.name, streak: profile.streak, weight: number(profile.weight), avatarText: profile.avatar_text },
      goals: { calories: goals.calories, protein: number(goals.protein), carbs: number(goals.carbs), fat: number(goals.fat), water: goals.water },
      meals: mealsResult.rows.map(meal => mealFromRows(meal, itemsResult.rows)),
      waterIntake: number(waterResult.rows[0].total),
    });
  } catch (error) { next(error); }
});

app.put('/api/profile', async (request, response, next) => {
  try {
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
    const { calories, protein, carbs, fat, water } = request.body;
    const result = await pool.query(
      `UPDATE nutrition_goals SET calories = COALESCE($2, calories), protein = COALESCE($3, protein),
       carbs = COALESCE($4, carbs), fat = COALESCE($5, fat), water = COALESCE($6, water), updated_at = NOW()
       WHERE user_id = $1 RETURNING *`, [userId, calories, protein, carbs, fat, water]
    );
    response.json(result.rows[0]);
  } catch (error) { next(error); }
});

async function saveMeal(meal, replace = false) {
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
  try { await saveMeal(request.body); response.status(201).json({ id: request.body.id }); } catch (error) { next(error); }
});
app.put('/api/meals/:id', async (request, response, next) => {
  try { await saveMeal({ ...request.body, id: request.params.id }, true); response.json({ id: request.params.id }); } catch (error) { next(error); }
});
app.delete('/api/meals/:id', async (request, response, next) => {
  try { await pool.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [request.params.id, userId]); response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/water', async (request, response, next) => {
  try { await pool.query('INSERT INTO water_entries (user_id, amount) VALUES ($1, $2)', [userId, request.body.amount]); response.status(201).json({ amount: request.body.amount }); } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Erro interno da API local.' });
});

app.listen(port, () => console.log(`API Caloriq disponível em http://localhost:${port}`));
