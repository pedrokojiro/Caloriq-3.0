// Recuperação de senha por código de 6 dígitos enviado por e-mail.
const { createHash, randomInt, timingSafeEqual } = require('node:crypto');
const { normalizeEmail, validEmail, hashPassword } = require('./auth');
const { FixedWindowLimiter, rateLimit } = require('./rate-limit');

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const GENERIC_SENT = 'Se houver uma conta com este e-mail, enviamos um código de 6 dígitos. Ele vale por 15 minutos.';
const INVALID_CODE = 'Código inválido ou expirado. Peça um novo código.';

const hashCode = (userId, code) => createHash('sha256').update(`${userId}:${code}`).digest('hex');
const sameHash = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function resetEmail(name, code) {
  const text = `Olá, ${name}!\n\nSeu código para redefinir a senha do CaloriQ é ${code}.\nEle vale por ${CODE_TTL_MINUTES} minutos.\n\nSe você não pediu a troca de senha, ignore este e-mail. Sua senha atual continua valendo.`;
  const html = `<div style="font-family:Roboto,Arial,sans-serif;color:#0D1117;max-width:480px">
    <p>Olá, ${name.replace(/[<>&"]/g, '')}!</p>
    <p>Seu código para redefinir a senha do <strong>CaloriQ</strong> é:</p>
    <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0E7A3E;margin:16px 0">${code}</p>
    <p>Ele vale por ${CODE_TTL_MINUTES} minutos.</p>
    <p style="color:#4A5565">Se você não pediu a troca de senha, ignore este e-mail. Sua senha atual continua valendo.</p>
  </div>`;
  return { subject: `${code} é o seu código do CaloriQ`, text, html };
}

function registerPasswordReset(app, { pool, sendEmail, issueSession, limits }) {
  const forgotIp = new FixedWindowLimiter(limits.forgotIp);
  const forgotEmail = new FixedWindowLimiter(limits.forgotEmail);
  const resetIp = new FixedWindowLimiter(limits.resetIp);
  const tooMany = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

  app.post('/api/auth/password/forgot',
    rateLimit(forgotIp, request => request.ip, tooMany),
    rateLimit(forgotEmail, request => normalizeEmail(request.body?.email) || null, tooMany),
    async (request, response, next) => {
      const email = normalizeEmail(request.body?.email);
      if (!validEmail(email)) return response.status(400).json({ error: 'Informe um e-mail válido.' });
      try {
        const found = await pool.query('SELECT id, name FROM users WHERE LOWER(email) = $1', [email]);
        const user = found.rows[0];
        let message = null;
        if (user) {
          const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
          await pool.query('DELETE FROM password_reset_codes WHERE user_id = $1', [user.id]);
          await pool.query(
            `INSERT INTO password_reset_codes (user_id, code_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${CODE_TTL_MINUTES} minutes')`,
            [user.id, hashCode(user.id, code)]
          );
          message = { to: email, ...resetEmail(user.name, code) };
        }
        // A resposta é a mesma com ou sem conta e não espera o envio, para não revelar quem está cadastrado.
        response.status(202).json({ message: GENERIC_SENT });
        if (message) sendEmail(message).catch(error => console.error('Falha ao enviar e-mail de recuperação:', error.message));
      } catch (error) { next(error); }
    });

  app.post('/api/auth/password/reset',
    rateLimit(resetIp, request => request.ip, tooMany),
    async (request, response, next) => {
      const body = request.body || {};
      const email = normalizeEmail(body.email);
      const code = String(body.code || '').replace(/\D/g, '');
      const password = String(body.password || '');
      if (!validEmail(email) || code.length !== 6) return response.status(400).json({ error: INVALID_CODE });
      if (password.length < 8 || password.length > 128) return response.status(400).json({ error: 'A senha deve ter entre 8 e 128 caracteres.' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const found = await client.query(
          `SELECT u.id, u.name, u.email, u.onboarding_completed, c.id AS code_id, c.code_hash, c.attempts
           FROM users u JOIN password_reset_codes c ON c.user_id = u.id
           WHERE LOWER(u.email) = $1 AND c.used_at IS NULL AND c.expires_at > NOW()
           ORDER BY c.created_at DESC LIMIT 1 FOR UPDATE OF c`,
          [email]
        );
        const row = found.rows[0];
        if (!row || row.attempts >= MAX_ATTEMPTS) {
          await client.query('ROLLBACK');
          return response.status(400).json({ error: INVALID_CODE });
        }
        if (!sameHash(row.code_hash, hashCode(row.id, code))) {
          await client.query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1', [row.code_id]);
          await client.query('COMMIT');
          const left = MAX_ATTEMPTS - row.attempts - 1;
          return response.status(400).json({ error: left > 0 ? `Código incorreto. Restam ${left} tentativa(s).` : INVALID_CODE });
        }
        await client.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [row.id, await hashPassword(password)]);
        await client.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1', [row.code_id]);
        // Encerra as sessões abertas em outros aparelhos e entra com uma sessão nova.
        await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [row.id]);
        const token = await issueSession(client, row.id, request);
        await client.query('COMMIT');
        response.json({ token, user: { id: row.id, name: row.name, email: row.email, onboardingCompleted: row.onboarding_completed } });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        next(error);
      } finally { client.release(); }
    });
}

module.exports = { registerPasswordReset, hashCode, CODE_TTL_MINUTES, MAX_ATTEMPTS };
