const express = require('express');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
const { normalizeEmail, validEmail, hashPassword, verifyPassword, createSessionToken, hashToken, sessionExpiry } = require('./auth');
const { GeminiProxyError, generateContent: defaultGenerateContent } = require('./gemini');
const { buildGeminiRequest } = require('./ai-validation');
const { FixedWindowLimiter, ConcurrencyLimiter, rateLimit } = require('./rate-limit');
const { calculateNutritionTargets, validateProfile } = require('./nutrition');
const { validateMeal, validateMealId, validateWaterChange, validateGoals, dayBounds } = require('./validation');

const DEFAULT_LIMITS = Object.freeze({
  aiWindow: { limit: 30, windowMs: 10 * 60 * 1000 },
  aiConcurrent: 3,
  loginIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  loginEmail: { limit: 8, windowMs: 15 * 60 * 1000 },
  registerIp: { limit: 5, windowMs: 60 * 60 * 1000 },
});

// No Render a requisição passa por um único proxy, que informa o IP real em
// X-Forwarded-For. Localmente não há proxy e o cabeçalho não deve ser confiado.
function resolveTimeZone(value) {
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return 'America/Sao_Paulo';
  }
}

const DISPLAY_TIME_ZONE = resolveTimeZone(process.env.DISPLAY_TIME_ZONE || 'America/Sao_Paulo');
const displayTimeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: DISPLAY_TIME_ZONE });
const formatDisplayTime = (value) => displayTimeFormat.format(new Date(value));

function trustProxyFromEnv(env = process.env) {
  const value = String(env.TRUST_PROXY ?? '').trim().toLowerCase();
  if (!value) return env.RENDER ? 1 : false;
  if (value === 'false' || value === '0') return false;
  if (value === 'true') return 1;
  return /^\d+$/.test(value) ? Number(value) : value;
}

function createApp({ pool, generateContent = defaultGenerateContent, limits = {}, trustProxy = trustProxyFromEnv() }) {
  const app = express();
  app.set('trust proxy', trustProxy);
  const settings = { ...DEFAULT_LIMITS, ...limits };
  const aiWindowLimiter = new FixedWindowLimiter(settings.aiWindow);
  const aiConcurrency = new ConcurrencyLimiter({ limit: settings.aiConcurrent });
  const loginIpLimiter = new FixedWindowLimiter(settings.loginIp);
  const loginEmailLimiter = new FixedWindowLimiter(settings.loginEmail);
  const registerIpLimiter = new FixedWindowLimiter(settings.registerIp);
  const tooManyLogins = 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';

  app.use(cors());
  app.use(express.json({ limit: '12mb' }));

  async function issueSession(client, userId) {
    const token = createSessionToken();
    await client.query('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [hashToken(token), userId, sessionExpiry()]);
    return token;
  }

  app.post('/api/auth/register', rateLimit(registerIpLimiter, request => request.ip,
    'Muitos cadastros a partir desta rede. Tente novamente mais tarde.'), async (request, response, next) => {
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
        VALUES ($1,$2,$3,$4,70,$5,0,FALSE)`, [id, name, email, await hashPassword(password), avatarText]);
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

  app.post('/api/auth/login',
    rateLimit(loginIpLimiter, request => request.ip, tooManyLogins),
    rateLimit(loginEmailLimiter, request => normalizeEmail(request.body?.email) || null, tooManyLogins),
    async (request, response, next) => {
    try {
      const body = request.body || {};
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      if (password.length > 128) return response.status(401).json({ error: 'E-mail ou senha incorretos.' });
      const result = await pool.query('SELECT id, name, email, password_hash, onboarding_completed FROM users WHERE LOWER(email) = $1', [email]);
      const user = result.rows[0];
      const passwordMatches = await verifyPassword(password, user?.password_hash);
      if (!user || !passwordMatches) {
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
    // Mantido para os APKs antigos, que exibem este campo. Versões novas calculam
    // o horário a partir de consumedAt no fuso do aparelho.
    time: formatDisplayTime(meal.consumed_at),
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

  app.post('/api/ai/generate',
    rateLimit(aiWindowLimiter, request => request.userId, 'Você atingiu o limite de análises por agora. Tente novamente em alguns minutos.'),
    async (request, response, next) => {
      response.set('Cache-Control', 'no-store');
      const { request: geminiRequest, error } = buildGeminiRequest(request.body);
      if (error) return response.status(400).json({ error, code: 'INVALID_REQUEST' });
      const release = aiConcurrency.acquire(request.userId);
      if (!release) {
        response.set('Retry-After', '5');
        return response.status(429).json({ error: 'Aguarde a análise anterior terminar.', code: 'RATE_LIMIT' });
      }
      try {
        response.json(await generateContent(geminiRequest));
      } catch (error) {
        if (error instanceof GeminiProxyError) {
          return response.status(error.status).json({ error: error.message, code: error.code });
        }
        next(error);
      } finally {
        release();
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
      const { dayStart, dayEnd } = dayBounds(_request.query.dayStart, _request.query.dayEnd);
      const [profileResult, goalsResult, mealsResult, itemsResult, waterResult] = await Promise.all([
        pool.query(`SELECT name, streak, weight, avatar_text, avatar_url, age, height_cm, calculation_sex,
          activity_level, objective, motivation, mindset, onboarding_completed FROM users WHERE id = $1`, [userId]),
        pool.query('SELECT calories, protein, carbs, fat, water FROM nutrition_goals WHERE user_id = $1', [userId]),
        pool.query('SELECT * FROM meals WHERE user_id = $1 ORDER BY consumed_at DESC', [userId]),
        pool.query('SELECT mi.* FROM meal_items mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id = $1', [userId]),
        pool.query('SELECT COALESCE(SUM(amount), 0) AS total FROM water_entries WHERE user_id = $1 AND consumed_at >= $2 AND consumed_at < $3', [userId, dayStart, dayEnd]),
      ]);
      const profile = profileResult.rows[0];
      const goals = goalsResult.rows[0];
      response.json({
        profile: { name: profile.name, streak: profile.streak, weight: number(profile.weight), avatarText: profile.avatar_text,
          avatarUrl: profile.avatar_url || undefined,
          age: profile.age, heightCm: profile.height_cm ? number(profile.height_cm) : undefined,
          calculationSex: profile.calculation_sex || undefined, activityLevel: profile.activity_level || undefined,
          objective: profile.objective || undefined, motivation: profile.motivation || undefined,
          mindset: profile.mindset || undefined, onboardingCompleted: profile.onboarding_completed },
        goals: { calories: goals.calories, protein: number(goals.protein), carbs: number(goals.carbs), fat: number(goals.fat), water: goals.water },
        meals: mealsResult.rows.map(meal => mealFromRows(meal, itemsResult.rows)),
        waterIntake: number(waterResult.rows[0].total),
      });
    } catch (error) { next(error); }
  });

  app.put('/api/profile', async (request, response, next) => {
    const client = await pool.connect();
    try {
      const userId = request.userId;
      const body = request.body || {};
      const currentResult = await client.query(`SELECT name, streak, weight, avatar_text, avatar_url, age, height_cm,
        calculation_sex, activity_level, objective, motivation, mindset, onboarding_completed FROM users WHERE id = $1`, [userId]);
      const current = currentResult.rows[0];
      if (!current) return response.status(404).json({ error: 'Perfil não encontrado.' });

      const merged = {
        name: body.name === undefined ? current.name : String(body.name).trim(),
        // A sequência é mantida pelo servidor; valores enviados pelo app são ignorados.
        streak: current.streak,
        weight: body.weight === undefined ? number(current.weight) : Number(body.weight),
        avatarText: body.avatarText === undefined ? current.avatar_text : String(body.avatarText).trim().slice(0, 4),
        age: body.age === undefined ? current.age : Number(body.age),
        heightCm: body.heightCm === undefined ? (current.height_cm === null ? null : number(current.height_cm)) : Number(body.heightCm),
        calculationSex: body.calculationSex === undefined ? current.calculation_sex : String(body.calculationSex),
        activityLevel: body.activityLevel === undefined ? current.activity_level : String(body.activityLevel),
        objective: body.objective === undefined ? current.objective : String(body.objective),
        motivation: body.motivation === undefined ? current.motivation : String(body.motivation).trim(),
        mindset: body.mindset === undefined ? current.mindset : String(body.mindset),
      };
      if (merged.name.length < 2 || merged.name.length > 120) return response.status(400).json({ error: 'Informe um nome válido.' });
      if (!Number.isFinite(merged.weight) || merged.weight < 30 || merged.weight > 350) return response.status(400).json({ error: 'Informe um peso entre 30 e 350 kg.' });
      if (!Number.isInteger(merged.streak) || merged.streak < 0) return response.status(400).json({ error: 'Sequência inválida.' });
      if (merged.motivation && merged.motivation.length > 300) return response.status(400).json({ error: 'Sua motivação deve ter até 300 caracteres.' });
      if (merged.mindset && !['disciplined', 'strategist', 'resilient', 'balanced', 'competitor'].includes(merged.mindset)) {
        return response.status(400).json({ error: 'Perfil de mentalidade inválido.' });
      }

      const hasAvatarUrl = Object.hasOwn(body, 'avatarUrl');
      const avatarUrl = hasAvatarUrl ? (body.avatarUrl ? String(body.avatarUrl) : null) : current.avatar_url;
      if (avatarUrl && (avatarUrl.length > 1_500_000 || !/^(data:image\/(?:jpeg|png|webp);base64,|https:\/\/)/i.test(avatarUrl))) {
        return response.status(400).json({ error: 'A foto deve ser JPG, PNG ou WebP e ter até aproximadamente 1 MB.' });
      }

      let calculatedGoals = null;
      if (body.recalculateGoals) {
        const validation = validateProfile({
          sex: merged.calculationSex, age: merged.age, heightCm: merged.heightCm, weight: merged.weight,
          activityLevel: merged.activityLevel, objective: merged.objective,
        });
        if (validation.error) return response.status(400).json({ error: validation.error });
        calculatedGoals = calculateNutritionTargets(validation.profile);
      }

      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE users SET name = $2, streak = $3, weight = $4, avatar_text = $5, avatar_url = $6,
         age = $7, height_cm = $8, calculation_sex = $9, activity_level = $10, objective = $11,
         motivation = $12, mindset = $13,
         updated_at = NOW() WHERE id = $1 RETURNING *`,
        [userId, merged.name, merged.streak, merged.weight, merged.avatarText || Array.from(merged.name)[0].toUpperCase(),
          avatarUrl, merged.age, merged.heightCm, merged.calculationSex, merged.activityLevel, merged.objective,
          merged.motivation || null, merged.mindset || null]
      );
      if (calculatedGoals) {
        await client.query(`UPDATE nutrition_goals SET calories = $2, protein = $3, carbs = $4, fat = $5,
          water = $6, updated_at = NOW() WHERE user_id = $1`,
        [userId, calculatedGoals.calories, calculatedGoals.protein, calculatedGoals.carbs, calculatedGoals.fat, calculatedGoals.water]);
      }
      await client.query('COMMIT');
      const saved = result.rows[0];
      response.json({
        profile: { name: saved.name, streak: saved.streak, weight: number(saved.weight), avatarText: saved.avatar_text,
          avatarUrl: saved.avatar_url || undefined, age: saved.age, heightCm: saved.height_cm ? number(saved.height_cm) : undefined,
          calculationSex: saved.calculation_sex || undefined, activityLevel: saved.activity_level || undefined,
          objective: saved.objective || undefined, motivation: saved.motivation || undefined,
          mindset: saved.mindset || undefined, onboardingCompleted: saved.onboarding_completed },
        goals: calculatedGoals ? { calories: calculatedGoals.calories, protein: calculatedGoals.protein,
          carbs: calculatedGoals.carbs, fat: calculatedGoals.fat, water: calculatedGoals.water } : undefined,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      next(error);
    } finally { client.release(); }
  });

  app.put('/api/goals', async (request, response, next) => {
    const { goals, error } = validateGoals(request.body);
    if (error) return response.status(400).json({ error });
    try {
      const result = await pool.query(
        `UPDATE nutrition_goals SET calories = COALESCE($2, calories), protein = COALESCE($3, protein),
         carbs = COALESCE($4, carbs), fat = COALESCE($5, fat), water = COALESCE($6, water), updated_at = NOW()
         WHERE user_id = $1 RETURNING *`,
        [request.userId, goals.calories ?? null, goals.protein ?? null, goals.carbs ?? null, goals.fat ?? null, goals.water ?? null]
      );
      response.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  async function inTransaction(work) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  // Os ids dos itens são gerados aqui; os enviados pelo app não são usados para
  // evitar colisão de chave primária entre contas.
  async function insertMealItems(client, mealId, items) {
    for (const item of items) {
      await client.query(
        `INSERT INTO meal_items (id, meal_id, name, amount, calories, protein, carbs, fat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [randomUUID(), mealId, item.name, item.amount, item.calories, item.protein, item.carbs, item.fat]
      );
    }
  }

  const mealValues = (meal, userId) => [meal.id, userId, meal.name, meal.type, meal.calories, meal.protein, meal.carbs,
    meal.fat, meal.portions, meal.emoji, meal.confidence, meal.insights, meal.consumedAt];

  // Insere a refeição com o id gerado pelo app. Se o id já existir, devolve o dono
  // para diferenciar um reenvio do mesmo usuário de uma colisão com outra conta.
  async function insertMeal(client, meal, userId) {
    const inserted = await client.query(
      `INSERT INTO meals (id, user_id, name, type, calories, protein, carbs, fat, portions, emoji, confidence, insights, consumed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13::timestamptz,NOW()))
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      mealValues(meal, userId)
    );
    if (inserted.rowCount) {
      await insertMealItems(client, meal.id, meal.items);
      return { created: true };
    }
    const existing = await client.query('SELECT user_id FROM meals WHERE id = $1', [meal.id]);
    return { created: false, ownerId: existing.rows[0]?.user_id };
  }

  app.post('/api/meals', async (request, response, next) => {
    const { meal, error } = validateMeal(request.body);
    if (error) return response.status(400).json({ error });
    try {
      const result = await inTransaction(client => insertMeal(client, meal, request.userId));
      if (result.created) return response.status(201).json({ id: meal.id });
      if (result.ownerId === request.userId) return response.status(200).json({ id: meal.id });
      response.status(409).json({ error: 'Este identificador de refeição já está em uso. Tente salvar novamente.', code: 'MEAL_ID_CONFLICT' });
    } catch (error) { next(error); }
  });

  app.put('/api/meals/:id', async (request, response, next) => {
    const { meal, error } = validateMeal({ ...request.body, id: request.params.id });
    if (error) return response.status(400).json({ error });
    try {
      const status = await inTransaction(async (client) => {
        const existing = await client.query('SELECT user_id FROM meals WHERE id = $1 FOR UPDATE', [meal.id]);
        if (!existing.rowCount) {
          // APKs antigos usam PUT também para refeições que não chegaram a ser criadas.
          const result = await insertMeal(client, meal, request.userId);
          return result.created || result.ownerId === request.userId ? 200 : 404;
        }
        if (existing.rows[0].user_id !== request.userId) return 404;
        await client.query(
          `UPDATE meals SET name = $3, type = $4, calories = $5, protein = $6, carbs = $7, fat = $8, portions = $9,
           emoji = $10, confidence = $11, insights = $12, consumed_at = COALESCE($13::timestamptz, consumed_at), updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          mealValues(meal, request.userId)
        );
        await client.query('DELETE FROM meal_items WHERE meal_id = $1', [meal.id]);
        await insertMealItems(client, meal.id, meal.items);
        return 200;
      });
      if (status === 404) return response.status(404).json({ error: 'Refeição não encontrada.' });
      response.json({ id: meal.id });
    } catch (error) { next(error); }
  });

  app.delete('/api/meals/:id', async (request, response, next) => {
    if (!validateMealId(request.params.id)) return response.status(400).json({ error: 'Identificador de refeição inválido.' });
    try {
      await pool.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [request.params.id, request.userId]);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  app.post('/api/water', async (request, response, next) => {
    const { amount, error } = validateWaterChange(request.body);
    if (error) return response.status(400).json({ error });
    const { dayStart, dayEnd } = dayBounds(request.body.dayStart, request.body.dayEnd);
    try {
      const result = await inTransaction(async (client) => {
        // Trava a linha do usuário para serializar ajustes simultâneos de água.
        await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [request.userId]);
        const current = await client.query(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM water_entries WHERE user_id = $1 AND consumed_at >= $2 AND consumed_at < $3',
          [request.userId, dayStart, dayEnd]
        );
        const total = Number(current.rows[0].total);
        if (total + amount < 0) return { rejected: true, total };
        await client.query('INSERT INTO water_entries (user_id, amount) VALUES ($1, $2)', [request.userId, amount]);
        return { rejected: false, total: total + amount };
      });
      if (result.rejected) {
        return response.status(409).json({ error: 'O consumo de água do dia não pode ficar negativo.', code: 'WATER_NEGATIVE', total: result.total });
      }
      response.status(201).json({ amount, total: result.total });
    } catch (error) { next(error); }
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    if (error?.type === 'entity.too.large') return response.status(413).json({ error: 'A foto é grande demais para análise.' });
    response.status(500).json({ error: 'Erro interno da API.' });
  });

  return app;
}

module.exports = { createApp, trustProxyFromEnv, formatDisplayTime, resolveTimeZone };
