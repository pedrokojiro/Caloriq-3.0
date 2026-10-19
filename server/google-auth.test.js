const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, createSign } = require('node:crypto');
const { createApp } = require('./app');
const { createGoogleVerifier } = require('./google-auth');
const { hashPassword } = require('./auth');
const { fakePool, startServer } = require('./test-helpers');

const CLIENT_ID = 'web-client.apps.googleusercontent.com';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'kid-1', alg: 'RS256', use: 'sig' };
const b64url = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

function idToken(claims = {}, { kid = 'kid-1', key = privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', kid, typ: 'JWT' });
  const payload = b64url({ iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'google-123', email: 'Ana@Gmail.com', email_verified: true, name: 'Ana Souza', iat: now, exp: now + 3600, ...claims });
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(key).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

const fetchKeys = async () => ({ ok: true, headers: { get: () => 'public, max-age=600' }, json: async () => ({ keys: [jwk] }) });

test('verificador aceita só tokens assinados pelo Google para o nosso cliente e com e-mail verificado', async () => {
  let calls = 0;
  const verifier = createGoogleVerifier({ clientIds: [CLIENT_ID], fetchImpl: async () => { calls += 1; return fetchKeys(); } });
  assert.deepEqual(await verifier.verify(idToken()), { sub: 'google-123', email: 'ana@gmail.com', name: 'Ana Souza' });
  await verifier.verify(idToken());
  assert.equal(calls, 1, 'chaves ficam em cache');
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  for (const token of [
    idToken({ aud: 'outro-app' }), idToken({ iss: 'https://evil.example' }), idToken({ exp: Math.floor(Date.now() / 1000) - 3600 }),
    idToken({}, { key: other }), idToken({}, { kid: 'desconhecido' }), 'a.b', `${idToken().slice(0, -4)}AAAA`,
  ]) await assert.rejects(verifier.verify(token), /invalid-token/);
  await assert.rejects(verifier.verify(idToken({ email_verified: false })), /unverified-email/);
});

async function setup({ users = [] } = {}) {
  const db = { users: [...users], goals: [], sessions: [] };
  const handler = (sql, params) => {
    const text = sql.replace(/\s+/g, ' ').trim();
    const rows = list => ({ rows: list, rowCount: list.length });
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(text)) return;
    if (/FROM users WHERE google_sub = \$1/.test(text)) return rows(db.users.filter(u => u.google_sub === params[0]));
    if (/^UPDATE users SET google_sub/.test(text)) {
      const user = db.users.find(u => u.email.toLowerCase() === params[1] && !u.google_sub);
      if (!user) return rows([]);
      user.google_sub = params[0]; return rows([user]);
    }
    if (/^INSERT INTO users/.test(text)) { db.users.push({ id: params[0], name: params[1], email: params[2], password_hash: null, google_sub: params[3], onboarding_completed: false }); return; }
    if (/^INSERT INTO nutrition_goals/.test(text)) { db.goals.push(params[0]); return; }
    if (/^INSERT INTO auth_sessions/.test(text)) { db.sessions.push({ user_id: params[1], device: params[3] }); return; }
    if (/^SELECT password_hash FROM users/.test(text)) return rows(db.users.filter(u => u.id === params[0]));
    if (/password_hash IS NOT NULL AS has_password/.test(text)) { const u = db.users.find(x => x.id === params[0]); return rows([{ has_password: Boolean(u.password_hash), google_linked: Boolean(u.google_sub) }]); }
    if (/^UPDATE users SET password_hash/.test(text)) { db.users.find(u => u.id === params[0]).password_hash = params[1]; return; }
    if (/^DELETE FROM auth_sessions WHERE user_id = \$1 AND token_hash <> \$2/.test(text)) return { rows: [], rowCount: 0 };
    if (/^DELETE FROM users WHERE id/.test(text)) { db.users = db.users.filter(u => u.id !== params[0]); return; }
    throw new Error(`SQL não simulado: ${text.slice(0, 70)}`);
  };
  const verifier = createGoogleVerifier({ clientIds: [CLIENT_ID], fetchImpl: fetchKeys });
  const tokens = Object.fromEntries(db.users.map(u => [`token-${u.id}`, { id: u.id }]));
  const server = await startServer(createApp({ pool: fakePool(handler, tokens), googleVerifier: verifier, trustProxy: false }));
  return { db, server };
}

test('primeiro login cria a conta; o segundo entra na mesma conta', async () => {
  const { db, server } = await setup();
  try {
    const first = await server.call('POST', '/api/auth/google', { body: { idToken: idToken() }, headers: { 'X-Client-Device': 'Pixel 8' } });
    assert.equal(first.status, 201);
    assert.equal(first.body.user.onboardingCompleted, false);
    assert.equal(db.users.length, 1);
    assert.equal(db.users[0].email, 'ana@gmail.com');
    assert.equal(db.users[0].password_hash, null);
    assert.equal(db.goals.length, 1);
    const second = await server.call('POST', '/api/auth/google', { body: { idToken: idToken() } });
    assert.equal(second.status, 200);
    assert.equal(second.body.user.id, first.body.user.id);
    assert.equal(db.sessions[0].device, 'Pixel 8');
    assert.equal((await server.call('POST', '/api/auth/google', { body: { idToken: idToken({ aud: 'x' }) } })).status, 401);
  } finally { await server.close(); }
});

test('e-mail já cadastrado com senha é vinculado, sem criar outra conta', async () => {
  const { db, server } = await setup({ users: [{ id: 'user-ana', name: 'Ana', email: 'ana@gmail.com', password_hash: await hashPassword('senha-123'), google_sub: null, onboarding_completed: true }] });
  try {
    const result = await server.call('POST', '/api/auth/google', { body: { idToken: idToken() } });
    assert.equal(result.status, 200);
    assert.equal(result.body.user.id, 'user-ana');
    assert.equal(result.body.user.onboardingCompleted, true);
    assert.equal(db.users.length, 1);
    assert.equal(db.users[0].google_sub, 'google-123');
  } finally { await server.close(); }
});

test('conta só do Google define senha sem a atual e exclui a conta só com a confirmação', async () => {
  const { db, server } = await setup({ users: [{ id: 'user-g', name: 'Gi', email: 'gi@gmail.com', password_hash: null, google_sub: 'g-9', onboarding_completed: true }] });
  try {
    assert.deepEqual((await server.call('GET', '/api/account/security', { token: 'token-user-g' })).body, { hasPassword: false, googleLinked: true });
    assert.equal((await server.call('PUT', '/api/account/password', { token: 'token-user-g', body: { newPassword: 'minha-senha-1' } })).status, 200);
    assert.ok(db.users[0].password_hash);
    db.users[0].password_hash = null;
    assert.equal((await server.call('DELETE', '/api/account', { token: 'token-user-g', body: { confirm: 'EXCLUIR' } })).status, 204);
    assert.equal(db.users.length, 0);
  } finally { await server.close(); }
});

test('sem GOOGLE_CLIENT_IDS a rota responde 503', async () => {
  const server = await startServer(createApp({ pool: fakePool(() => undefined), googleVerifier: createGoogleVerifier({ clientIds: [] }) }));
  try {
    const result = await server.call('POST', '/api/auth/google', { body: { idToken: idToken() } });
    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'GOOGLE_DISABLED');
  } finally { await server.close(); }
});
