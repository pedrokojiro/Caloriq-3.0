const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, trustProxyFromEnv } = require('./app');
const { hashPassword } = require('./auth');
const { fakePool, startServer } = require('./test-helpers');

async function loginApp(options) {
  const passwordHash = await hashPassword('senha-correta');
  const pool = fakePool((sql, params) => {
    if (/FROM users WHERE LOWER\(email\)/.test(sql)) {
      return params[0] === 'ana@teste.local'
        ? { rows: [{ id: 'user-ana', name: 'Ana', email: 'ana@teste.local', password_hash: passwordHash, onboarding_completed: true }], rowCount: 1 }
        : { rows: [], rowCount: 0 };
    }
  });
  return startServer(createApp({ pool, ...options }));
}

test('login funciona e erra da mesma forma para senha errada e e-mail inexistente', async () => {
  const { call, close } = await loginApp({});
  try {
    const ok = await call('POST', '/api/auth/login', { body: { email: 'ANA@teste.local', password: 'senha-correta' } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    const wrong = await call('POST', '/api/auth/login', { body: { email: 'ana@teste.local', password: 'errada-123' } });
    const missing = await call('POST', '/api/auth/login', { body: { email: 'ninguem@teste.local', password: 'errada-123' } });
    assert.equal(wrong.status, 401);
    assert.deepEqual(missing, { ...wrong, headers: missing.headers });
  } finally { await close(); }
});

test('login é limitado por e-mail e por IP com Retry-After', async () => {
  const limits = { loginIp: { limit: 4, windowMs: 60_000 }, loginEmail: { limit: 2, windowMs: 60_000 } };
  const { call, close } = await loginApp({ limits, trustProxy: false });
  try {
    const attempt = email => call('POST', '/api/auth/login', { body: { email, password: 'errada-123' } });
    assert.equal((await attempt('ana@teste.local')).status, 401);
    assert.equal((await attempt('Ana@Teste.local')).status, 401);
    const blockedEmail = await attempt('ana@teste.local');
    assert.equal(blockedEmail.status, 429);
    assert.equal(blockedEmail.body.code, 'RATE_LIMIT');
    assert.ok(Number(blockedEmail.headers.get('retry-after')) > 0);
    assert.equal((await attempt('outro@teste.local')).status, 401, 'outro e-mail ainda pode tentar');
    assert.equal((await attempt('mais-um@teste.local')).status, 429, 'limite por IP alcançado');
  } finally { await close(); }
});

test('com trust proxy o IP vem do X-Forwarded-For; sem ele o cabeçalho é ignorado', async () => {
  const limits = { registerIp: { limit: 1, windowMs: 60_000 } };
  const register = (call, ip) => call('POST', '/api/auth/register', { body: {}, headers: { 'X-Forwarded-For': ip } });

  const behindProxy = await startServer(createApp({ pool: fakePool(() => undefined), limits, trustProxy: 1 }));
  try {
    assert.equal((await register(behindProxy.call, '203.0.113.1')).status, 400);
    assert.equal((await register(behindProxy.call, '203.0.113.2')).status, 400, 'IPs reais diferentes têm cotas separadas');
    assert.equal((await register(behindProxy.call, '203.0.113.1')).status, 429);
  } finally { await behindProxy.close(); }

  const direct = await startServer(createApp({ pool: fakePool(() => undefined), limits, trustProxy: false }));
  try {
    assert.equal((await register(direct.call, '203.0.113.1')).status, 400);
    assert.equal((await register(direct.call, '203.0.113.2')).status, 429, 'cabeçalho forjado não burla o limite');
  } finally { await direct.close(); }
});

test('TRUST_PROXY padrão confia em um proxy só no Render', () => {
  assert.equal(trustProxyFromEnv({}), false);
  assert.equal(trustProxyFromEnv({ RENDER: 'true' }), 1);
  assert.equal(trustProxyFromEnv({ RENDER: 'true', TRUST_PROXY: 'false' }), false);
  assert.equal(trustProxyFromEnv({ TRUST_PROXY: '2' }), 2);
});
