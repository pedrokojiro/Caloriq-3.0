const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { hashPassword, verifyPassword } = require('./auth');
const { createMailer } = require('./mailer');
const { fakePool, startServer } = require('./test-helpers');

async function setup({ limits } = {}) {
  const db = {
    users: [{ id: 'user-ana', name: 'Ana', email: 'ana@teste.local', password_hash: await hashPassword('senha-antiga'), onboarding_completed: true }],
    codes: [], sessions: [{ user_id: 'user-ana', token_hash: 'x'.repeat(64) }], nextId: 1, now: Date.now(),
  };
  const handler = (sql, params) => {
    const text = sql.replace(/\s+/g, ' ').trim();
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(text)) return;
    if (/^SELECT id, name FROM users WHERE LOWER\(email\)/.test(text)) {
      const rows = db.users.filter(user => user.email === params[0]); return { rows, rowCount: rows.length };
    }
    if (/^DELETE FROM password_reset_codes WHERE user_id/.test(text)) { db.codes = db.codes.filter(code => code.user_id !== params[0]); return; }
    if (/^INSERT INTO password_reset_codes/.test(text)) {
      db.codes.push({ id: db.nextId++, user_id: params[0], code_hash: params[1], attempts: 0, expires_at: db.now + 15 * 60_000, used_at: null, created_at: db.now }); return;
    }
    if (/FROM users u JOIN password_reset_codes c/.test(text)) {
      const user = db.users.find(item => item.email === params[0]);
      const code = user && db.codes.filter(item => item.user_id === user.id && !item.used_at && item.expires_at > db.now).sort((a, b) => b.created_at - a.created_at)[0];
      if (!code) return { rows: [], rowCount: 0 };
      return { rows: [{ ...user, code_id: code.id, code_hash: code.code_hash, attempts: code.attempts }], rowCount: 1 };
    }
    if (/^UPDATE password_reset_codes SET attempts/.test(text)) { db.codes.find(code => code.id === params[0]).attempts += 1; return; }
    if (/^UPDATE password_reset_codes SET used_at/.test(text)) { db.codes.find(code => code.id === params[0]).used_at = db.now; return; }
    if (/^UPDATE users SET password_hash/.test(text)) { db.users.find(user => user.id === params[0]).password_hash = params[1]; return; }
    if (/^DELETE FROM auth_sessions WHERE user_id/.test(text)) { db.sessions = db.sessions.filter(session => session.user_id !== params[0]); return; }
    if (/^INSERT INTO auth_sessions/.test(text)) { db.sessions.push({ token_hash: params[0], user_id: params[1] }); return; }
    throw new Error(`SQL não simulado: ${text.slice(0, 80)}`);
  };
  const sent = [];
  const sendEmail = async (message) => { sent.push(message); return { delivered: true }; };
  const server = await startServer(createApp({ pool: fakePool(handler), sendEmail, limits, trustProxy: false }));
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const codeFromMail = () => sent.at(-1).text.match(/\b(\d{6})\b/)[1];
  return { db, sent, server, flush, codeFromMail };
}

test('pedido de código responde igual com e sem conta e só envia e-mail para quem existe', async () => {
  const { sent, server, flush, db } = await setup();
  try {
    const unknown = await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ninguem@teste.local' } });
    const known = await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ANA@teste.local' } });
    await flush();
    assert.equal(unknown.status, 202);
    assert.deepEqual(unknown.body, known.body);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'ana@teste.local');
    assert.match(sent[0].subject, /^\d{6} é o seu código/);
    assert.equal(db.codes.length, 1);
    assert.equal(db.codes[0].code_hash.includes(sent[0].text.match(/\d{6}/)[0]), false, 'o código não é guardado em texto puro');
    assert.equal((await server.call('POST', '/api/auth/password/forgot', { body: { email: 'invalido' } })).status, 400);
  } finally { await server.close(); }
});

test('código correto troca a senha, encerra sessões antigas e não pode ser reutilizado', async () => {
  const { db, server, flush, codeFromMail } = await setup();
  try {
    await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ana@teste.local' } });
    await flush();
    const code = codeFromMail();
    const ok = await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code, password: 'senha-nova-123' } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    assert.equal(ok.body.user.id, 'user-ana');
    assert.equal(await verifyPassword('senha-nova-123', db.users[0].password_hash), true);
    assert.equal(await verifyPassword('senha-antiga', db.users[0].password_hash), false);
    assert.deepEqual(db.sessions.map(session => session.user_id), ['user-ana']);
    assert.notEqual(db.sessions[0].token_hash, 'x'.repeat(64), 'sessão antiga removida, nova criada');
    const reuse = await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code, password: 'outra-senha-123' } });
    assert.equal(reuse.status, 400);
  } finally { await server.close(); }
});

test('código errado conta tentativas e bloqueia após 5; código expirado é recusado', async () => {
  const { db, server, flush, codeFromMail } = await setup();
  try {
    await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ana@teste.local' } });
    await flush();
    const code = codeFromMail();
    const wrong = code === '000000' ? '111111' : '000000';
    const first = await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code: wrong, password: 'senha-nova-123' } });
    assert.equal(first.status, 400);
    assert.match(first.body.error, /Restam 4/);
    for (let i = 0; i < 4; i += 1) await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code: wrong, password: 'senha-nova-123' } });
    const blocked = await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code, password: 'senha-nova-123' } });
    assert.equal(blocked.status, 400, 'após 5 erros nem o código certo funciona');
    assert.equal(await verifyPassword('senha-antiga', db.users[0].password_hash), true);

    await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ana@teste.local' } });
    await flush();
    const fresh = codeFromMail();
    db.now += 16 * 60_000;
    assert.equal((await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code: fresh, password: 'senha-nova-123' } })).status, 400);
    assert.equal((await server.call('POST', '/api/auth/password/reset', { body: { email: 'ana@teste.local', code: '12345', password: 'senha-nova-123' } })).status, 400);
  } finally { await server.close(); }
});

test('pedidos de código são limitados por e-mail', async () => {
  const { server } = await setup({ limits: { forgotEmail: { limit: 2, windowMs: 60_000 } } });
  try {
    for (let i = 0; i < 2; i += 1) assert.equal((await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ana@teste.local' } })).status, 202);
    const blocked = await server.call('POST', '/api/auth/password/forgot', { body: { email: 'ana@teste.local' } });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  } finally { await server.close(); }
});

test('mailer envia pelo Resend com a chave e não envia sem ela', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, text: async () => '' }; };
  const send = createMailer({ apiKey: 're_test', from: 'CaloriQ <oi@caloriq.app>', fetchImpl });
  assert.deepEqual(await send({ to: 'ana@teste.local', subject: 'Oi', text: 'Olá' }), { delivered: true });
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
  assert.deepEqual(JSON.parse(calls[0].init.body).to, ['ana@teste.local']);
  const original = console.warn; console.warn = () => {};
  try { assert.deepEqual(await createMailer({ apiKey: '', fetchImpl })({ to: 'a@b.c', subject: 's', text: 't' }), { delivered: false }); }
  finally { console.warn = original; }
  assert.equal(calls.length, 1);
  const failing = createMailer({ apiKey: 're_test', fetchImpl: async () => ({ ok: false, status: 422, text: async () => 'domain not verified' }) });
  await assert.rejects(failing({ to: 'a@b.c', subject: 's', text: 't' }), /422/);
});
