const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { hashPassword, verifyPassword, hashToken } = require('./auth');
const { fakePool, startServer } = require('./test-helpers');

async function setup() {
  const db = {
    users: [
      { id: 'user-a', name: 'Ana', email: 'ana@teste.local', password_hash: await hashPassword('senha-da-ana') },
      { id: 'user-b', name: 'Bia', email: 'bia@teste.local', password_hash: await hashPassword('senha-da-bia') },
    ],
    sessions: [
      { token_hash: hashToken('token-a'), user_id: 'user-a', device_label: 'Pixel 7 · Android 15', created_at: new Date('2026-10-01'), last_seen_at: new Date('2026-10-19') },
      { token_hash: hashToken('token-a-tablet'), user_id: 'user-a', device_label: 'Galaxy Tab', created_at: new Date('2026-09-01'), last_seen_at: null },
      { token_hash: hashToken('token-b'), user_id: 'user-b', device_label: 'Moto G', created_at: new Date('2026-09-10'), last_seen_at: null },
    ],
    meals: [{ id: 'm1', user_id: 'user-a', name: 'Arroz', consumed_at: new Date('2026-10-18') }, { id: 'm2', user_id: 'user-b', name: 'Pão', consumed_at: new Date() }],
    items: [{ meal_id: 'm1', name: 'Arroz', amount: '100 g', calories: 130, protein: 3, carbs: 28, fat: 0 }],
    water: [{ user_id: 'user-a', amount: 250, consumed_at: new Date() }],
  };
  const handler = (sql, params) => {
    const text = sql.replace(/\s+/g, ' ').trim();
    const rows = list => ({ rows: list, rowCount: list.length });
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(text)) return;
    if (/^SELECT password_hash FROM users WHERE id/.test(text)) return rows(db.users.filter(u => u.id === params[0]));
    if (/^SELECT token_hash, device_label, created_at, last_seen_at FROM auth_sessions/.test(text)) return rows(db.sessions.filter(s => s.user_id === params[0]));
    if (/^DELETE FROM auth_sessions WHERE user_id = \$1 AND token_hash <> \$2/.test(text)) {
      const before = db.sessions.length; db.sessions = db.sessions.filter(s => !(s.user_id === params[0] && s.token_hash !== params[1])); return { rows: [], rowCount: before - db.sessions.length };
    }
    if (/^DELETE FROM auth_sessions WHERE user_id = \$1 AND LEFT\(token_hash, 16\)/.test(text)) {
      const before = db.sessions.length; db.sessions = db.sessions.filter(s => !(s.user_id === params[0] && s.token_hash.slice(0, 16) === params[1])); return { rows: [], rowCount: before - db.sessions.length };
    }
    if (/^UPDATE users SET password_hash/.test(text)) { db.users.find(u => u.id === params[0]).password_hash = params[1]; return; }
    if (/^SELECT id, name, email, weight/.test(text)) return rows(db.users.filter(u => u.id === params[0]).map(({ password_hash: _p, ...u }) => u));
    if (/FROM nutrition_goals/.test(text)) return rows([{ calories: 2000 }]);
    if (/^SELECT id, name, type/.test(text)) return rows(db.meals.filter(m => m.user_id === params[0]));
    if (/^SELECT mi.meal_id/.test(text)) { const ids = db.meals.filter(m => m.user_id === params[0]).map(m => m.id); return rows(db.items.filter(i => ids.includes(i.meal_id))); }
    if (/FROM water_entries/.test(text)) return rows(db.water.filter(w => w.user_id === params[0]));
    if (/^SELECT device_label, created_at, last_seen_at FROM auth_sessions/.test(text)) return rows(db.sessions.filter(s => s.user_id === params[0]));
    if (/^DELETE FROM users WHERE id/.test(text)) {
      db.users = db.users.filter(u => u.id !== params[0]); db.sessions = db.sessions.filter(s => s.user_id !== params[0]); db.meals = db.meals.filter(m => m.user_id !== params[0]); return;
    }
    throw new Error(`SQL não simulado: ${text.slice(0, 80)}`);
  };
  const app = createApp({ pool: fakePool(handler, { 'token-a': { id: 'user-a' }, 'token-b': { id: 'user-b' } }), trustProxy: false });
  const server = await startServer(app);
  return { db, server };
}

test('lista só as sessões da própria conta e marca o aparelho atual', async () => {
  const { server } = await setup();
  try {
    const result = await server.call('GET', '/api/account/sessions', { token: 'token-a' });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.sessions.map(s => [s.device, s.current]), [['Pixel 7 · Android 15', true], ['Galaxy Tab', false]]);
    assert.ok(result.body.sessions.every(s => /^[a-f0-9]{16}$/.test(s.id)), 'não expõe o hash completo');
  } finally { await server.close(); }
});

test('encerra uma sessão específica ou todas as outras, nunca a de outra conta', async () => {
  const { db, server } = await setup();
  try {
    const bId = hashToken('token-b').slice(0, 16);
    assert.equal((await server.call('DELETE', `/api/account/sessions/${bId}`, { token: 'token-a' })).status, 404);
    const currentId = hashToken('token-a').slice(0, 16);
    assert.equal((await server.call('DELETE', `/api/account/sessions/${currentId}`, { token: 'token-a' })).status, 400);
    const tabletId = hashToken('token-a-tablet').slice(0, 16);
    assert.equal((await server.call('DELETE', `/api/account/sessions/${tabletId}`, { token: 'token-a' })).status, 204);
    assert.deepEqual(db.sessions.map(s => s.device_label), ['Pixel 7 · Android 15', 'Moto G']);
    db.sessions.push({ token_hash: hashToken('token-a-web'), user_id: 'user-a', device_label: 'Web', created_at: new Date() });
    const others = await server.call('DELETE', '/api/account/sessions/others', { token: 'token-a' });
    assert.equal(others.body.ended, 1);
    assert.deepEqual(db.sessions.map(s => s.device_label), ['Pixel 7 · Android 15', 'Moto G']);
  } finally { await server.close(); }
});

test('troca de senha exige a senha atual e encerra as outras sessões', async () => {
  const { db, server } = await setup();
  try {
    assert.equal((await server.call('PUT', '/api/account/password', { token: 'token-a', body: { currentPassword: 'errada', newPassword: 'nova-senha-123' } })).status, 400);
    assert.equal((await server.call('PUT', '/api/account/password', { token: 'token-a', body: { currentPassword: 'senha-da-ana', newPassword: 'curta' } })).status, 400);
    assert.equal((await server.call('PUT', '/api/account/password', { token: 'token-a', body: { currentPassword: 'senha-da-ana', newPassword: 'senha-da-ana' } })).status, 400);
    const ok = await server.call('PUT', '/api/account/password', { token: 'token-a', body: { currentPassword: 'senha-da-ana', newPassword: 'nova-senha-123' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.endedSessions, 1);
    assert.equal(await verifyPassword('nova-senha-123', db.users[0].password_hash), true);
    assert.deepEqual(db.sessions.filter(s => s.user_id === 'user-a').map(s => s.device_label), ['Pixel 7 · Android 15']);
  } finally { await server.close(); }
});

test('exportação traz só os dados da conta, sem hash de senha', async () => {
  const { server } = await setup();
  try {
    const result = await server.call('GET', '/api/account/export', { token: 'token-a' });
    assert.equal(result.status, 200);
    assert.match(result.headers.get('content-disposition'), /attachment; filename="caloriq-dados-\d{4}-\d{2}-\d{2}\.json"/);
    assert.equal(result.body.format, 'caloriq-export-v1');
    assert.equal(result.body.account.email, 'ana@teste.local');
    assert.equal(JSON.stringify(result.body).includes('password_hash'), false);
    assert.deepEqual(result.body.meals.map(m => [m.id, m.items.length]), [['m1', 1]]);
    assert.equal(result.body.waterEntries.length, 1);
  } finally { await server.close(); }
});

test('exclusão exige confirmação e senha e apaga apenas a própria conta', async () => {
  const { db, server } = await setup();
  try {
    assert.equal((await server.call('DELETE', '/api/account', { token: 'token-a', body: { password: 'senha-da-ana' } })).status, 400);
    assert.equal((await server.call('DELETE', '/api/account', { token: 'token-a', body: { password: 'errada', confirm: 'EXCLUIR' } })).status, 400);
    assert.equal((await server.call('DELETE', '/api/account', { token: 'token-a', body: { password: 'senha-da-ana', confirm: 'EXCLUIR' } })).status, 204);
    assert.deepEqual(db.users.map(u => u.id), ['user-b']);
    assert.deepEqual(db.meals.map(m => m.user_id), ['user-b']);
    assert.deepEqual(db.sessions.map(s => s.user_id), ['user-b']);
  } finally { await server.close(); }
});
