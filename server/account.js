// Privacidade e gerenciamento da conta: senha, sessões, exportação e exclusão.
const { hashPassword, verifyPassword } = require('./auth');
const { FixedWindowLimiter, rateLimit } = require('./rate-limit');

const PUBLIC_ID_LENGTH = 16;
const publicSessionId = (tokenHash) => String(tokenHash).slice(0, PUBLIC_ID_LENGTH);

function deviceLabel(request) {
  const raw = String(request.get('x-client-device') || request.get('user-agent') || '');
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 120) || null;
}

function registerAccount(app, { pool, limits, collectFiles = async () => [], removeFiles = async () => {} }) {
  const passwordLimiter = new FixedWindowLimiter(limits.accountPassword);
  const tooMany = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  const byUser = request => request.userId;

  async function checkPassword(userId, password) {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    return verifyPassword(String(password || '').slice(0, 128), result.rows[0]?.password_hash);
  }

  app.get('/api/account/sessions', async (request, response, next) => {
    try {
      const result = await pool.query(
        `SELECT token_hash, device_label, created_at, last_seen_at FROM auth_sessions
         WHERE user_id = $1 AND expires_at > NOW() ORDER BY COALESCE(last_seen_at, created_at) DESC`,
        [request.userId]
      );
      response.set('Cache-Control', 'no-store');
      response.json({
        sessions: result.rows.map(row => ({
          id: publicSessionId(row.token_hash),
          device: row.device_label || 'Aparelho desconhecido',
          createdAt: new Date(row.created_at).toISOString(),
          lastSeenAt: new Date(row.last_seen_at || row.created_at).toISOString(),
          current: row.token_hash === request.authTokenHash,
        })),
      });
    } catch (error) { next(error); }
  });

  app.delete('/api/account/sessions/others', async (request, response, next) => {
    try {
      const result = await pool.query('DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2', [request.userId, request.authTokenHash]);
      response.json({ ended: result.rowCount });
    } catch (error) { next(error); }
  });

  app.delete('/api/account/sessions/:id', async (request, response, next) => {
    const id = String(request.params.id || '');
    if (!/^[a-f0-9]{16}$/.test(id)) return response.status(400).json({ error: 'Sessão inválida.' });
    if (publicSessionId(request.authTokenHash) === id) return response.status(400).json({ error: 'Para encerrar esta sessão, use "Sair da conta".' });
    try {
      const result = await pool.query('DELETE FROM auth_sessions WHERE user_id = $1 AND LEFT(token_hash, 16) = $2', [request.userId, id]);
      if (!result.rowCount) return response.status(404).json({ error: 'Sessão não encontrada.' });
      response.status(204).end();
    } catch (error) { next(error); }
  });

  app.put('/api/account/password', rateLimit(passwordLimiter, byUser, tooMany), async (request, response, next) => {
    const { currentPassword, newPassword } = request.body || {};
    const next_ = String(newPassword || '');
    if (next_.length < 8 || next_.length > 128) return response.status(400).json({ error: 'A nova senha deve ter entre 8 e 128 caracteres.' });
    try {
      if (!(await checkPassword(request.userId, currentPassword))) return response.status(400).json({ error: 'A senha atual está incorreta.' });
      if (await checkPassword(request.userId, next_)) return response.status(400).json({ error: 'A nova senha precisa ser diferente da atual.' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [request.userId, await hashPassword(next_)]);
        const ended = await client.query('DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2', [request.userId, request.authTokenHash]);
        await client.query('COMMIT');
        response.json({ endedSessions: ended.rowCount });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally { client.release(); }
    } catch (error) { next(error); }
  });

  // Portabilidade (LGPD art. 18): todos os dados da conta em JSON.
  app.get('/api/account/export', async (request, response, next) => {
    try {
      const userId = request.userId;
      const [user, goals, meals, items, water, sessions, photos] = await Promise.all([
        pool.query(`SELECT id, name, email, weight, age, height_cm, calculation_sex, activity_level, objective, motivation, mindset,
          avatar_text, streak, onboarding_completed, created_at, updated_at FROM users WHERE id = $1`, [userId]),
        pool.query('SELECT calories, protein, carbs, fat, water, updated_at FROM nutrition_goals WHERE user_id = $1', [userId]),
        pool.query(`SELECT id, name, type, calories, protein, carbs, fat, portions, emoji, confidence, insights, consumed_at, created_at
          FROM meals WHERE user_id = $1 ORDER BY consumed_at`, [userId]),
        pool.query(`SELECT mi.meal_id, mi.name, mi.amount, mi.calories, mi.protein, mi.carbs, mi.fat
          FROM meal_items mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id = $1`, [userId]),
        pool.query('SELECT amount, consumed_at FROM water_entries WHERE user_id = $1 ORDER BY consumed_at', [userId]),
        pool.query('SELECT device_label, created_at, last_seen_at FROM auth_sessions WHERE user_id = $1', [userId]),
        pool.query('SELECT id, angle, weight, taken_at FROM progress_photos WHERE user_id = $1 ORDER BY taken_at', [userId]),
      ]);
      const itemsByMeal = new Map();
      for (const item of items.rows) {
        if (!itemsByMeal.has(item.meal_id)) itemsByMeal.set(item.meal_id, []);
        const { meal_id: _mealId, ...rest } = item;
        itemsByMeal.get(item.meal_id).push(rest);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      response.set('Cache-Control', 'no-store');
      response.set('Content-Disposition', `attachment; filename="caloriq-dados-${stamp}.json"`);
      response.json({
        exportedAt: new Date().toISOString(),
        format: 'caloriq-export-v1',
        account: user.rows[0],
        goals: goals.rows[0] || null,
        meals: meals.rows.map(meal => ({ ...meal, items: itemsByMeal.get(meal.id) || [] })),
        waterEntries: water.rows,
        sessions: sessions.rows,
        progressPhotos: photos.rows,
      });
    } catch (error) { next(error); }
  });

  app.delete('/api/account', rateLimit(passwordLimiter, byUser, tooMany), async (request, response, next) => {
    try {
      if (request.body?.confirm !== 'EXCLUIR') return response.status(400).json({ error: 'Confirme digitando EXCLUIR.' });
      if (!(await checkPassword(request.userId, request.body?.password))) return response.status(400).json({ error: 'A senha está incorreta.' });
      // Os arquivos (fotos) precisam ser listados antes: as linhas somem por cascata junto com a conta.
      const files = await collectFiles(request.userId);
      // As tabelas relacionadas usam ON DELETE CASCADE: refeições, água, metas, sessões, códigos e fotos.
      await pool.query('DELETE FROM users WHERE id = $1', [request.userId]);
      await removeFiles(files).catch(error => console.error('Arquivos da conta excluída não removidos:', error.message));
      response.status(204).end();
    } catch (error) { next(error); }
  });
}

module.exports = { registerAccount, deviceLabel, publicSessionId };
