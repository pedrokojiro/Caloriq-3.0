// Login com Google: valida o ID token (JWT RS256) com as chaves públicas do Google.
const { createPublicKey, createVerify } = require('node:crypto');
const { randomUUID } = require('node:crypto');
const { FixedWindowLimiter, rateLimit } = require('./rate-limit');

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

const b64url = text => Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function createGoogleVerifier({ clientIds = String(process.env.GOOGLE_CLIENT_IDS || '').split(',').map(id => id.trim()).filter(Boolean), fetchImpl = fetch, now = () => Date.now() } = {}) {
  let cache = { keys: new Map(), expiresAt: 0 };

  async function keyFor(kid) {
    if (!cache.keys.has(kid) || cache.expiresAt < now()) {
      const response = await fetchImpl(CERTS_URL);
      if (!response.ok) throw new Error(`Chaves do Google indisponíveis (${response.status}).`);
      const body = await response.json();
      const maxAge = Number(/max-age=(\d+)/.exec(response.headers?.get?.('cache-control') || '')?.[1] || 3600);
      cache = { keys: new Map(body.keys.map(jwk => [jwk.kid, createPublicKey({ key: jwk, format: 'jwk' })])), expiresAt: now() + maxAge * 1000 };
    }
    return cache.keys.get(kid);
  }

  return {
    enabled: clientIds.length > 0,
    async verify(idToken) {
      const parts = String(idToken || '').split('.');
      if (parts.length !== 3) throw new Error('invalid-token');
      const header = JSON.parse(b64url(parts[0]).toString('utf8'));
      if (header.alg !== 'RS256' || !header.kid) throw new Error('invalid-token');
      const key = await keyFor(header.kid);
      if (!key) throw new Error('invalid-token');
      const valid = createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`).verify(key, b64url(parts[2]));
      if (!valid) throw new Error('invalid-token');
      const claims = JSON.parse(b64url(parts[1]).toString('utf8'));
      const seconds = now() / 1000;
      if (!ISSUERS.has(claims.iss) || !clientIds.includes(claims.aud) || !(claims.exp > seconds - 60) || (claims.iat && claims.iat > seconds + 300)) throw new Error('invalid-token');
      if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error('unverified-email');
      return { sub: String(claims.sub), email: String(claims.email).toLowerCase(), name: String(claims.name || claims.given_name || claims.email.split('@')[0]).slice(0, 120) };
    },
  };
}

function registerGoogleAuth(app, { pool, verifier, issueSession, limits }) {
  const limiter = new FixedWindowLimiter(limits.loginIp);

  app.post('/api/auth/google', rateLimit(limiter, request => request.ip, 'Muitas tentativas de login. Aguarde alguns minutos.'), async (request, response, next) => {
    if (!verifier.enabled) return response.status(503).json({ error: 'O login com Google não está configurado no servidor.', code: 'GOOGLE_DISABLED' });
    let profile;
    try {
      profile = await verifier.verify(request.body?.idToken);
    } catch (error) {
      return response.status(401).json({ error: error.message === 'unverified-email' ? 'Seu e-mail do Google ainda não foi verificado.' : 'Não foi possível confirmar sua conta Google. Tente novamente.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let user = (await client.query('SELECT id, name, email, onboarding_completed FROM users WHERE google_sub = $1', [profile.sub])).rows[0];
      if (!user) {
        // E-mail verificado pelo Google: vincula à conta existente com o mesmo e-mail.
        user = (await client.query('UPDATE users SET google_sub = $1, updated_at = NOW() WHERE LOWER(email) = $2 AND google_sub IS NULL RETURNING id, name, email, onboarding_completed', [profile.sub, profile.email])).rows[0];
      }
      let created = false;
      if (!user) {
        const id = randomUUID();
        await client.query(`INSERT INTO users (id, name, email, password_hash, google_sub, weight, avatar_text, streak, onboarding_completed)
          VALUES ($1,$2,$3,NULL,$4,70,$5,0,FALSE)`, [id, profile.name, profile.email, profile.sub, Array.from(profile.name)[0].toUpperCase()]);
        await client.query('INSERT INTO nutrition_goals (user_id, calories, protein, carbs, fat, water) VALUES ($1,2000,150,200,65,2500)', [id]);
        user = { id, name: profile.name, email: profile.email, onboarding_completed: false };
        created = true;
      }
      const token = await issueSession(client, user.id, request);
      await client.query('COMMIT');
      response.status(created ? 201 : 200).json({ token, user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: user.onboarding_completed } });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      next(error);
    } finally { client.release(); }
  });
}

module.exports = { createGoogleVerifier, registerGoogleAuth };
