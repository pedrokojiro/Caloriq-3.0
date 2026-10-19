const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { hashPassword } = require('./auth');
const { createStorage, detectImageType } = require('./storage');
const { fakePool, startServer } = require('./test-helpers');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]).toString('base64');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]).toString('base64');

function fakeStorage({ failUpload = false } = {}) {
  const files = new Map();
  return {
    files, enabled: true,
    async upload(path, bytes, type) { if (failUpload) throw new Error('falha'); files.set(path, { bytes, type }); },
    async signedUrls(paths) { return new Map(paths.filter(p => files.has(p)).map(p => [p, `https://storage.test/sign/${p}?token=x`])); },
    async remove(paths) { paths.forEach(p => files.delete(p)); },
  };
}

async function setup({ storage = fakeStorage(), failInsert = false } = {}) {
  const db = { photos: [], users: [{ id: 'user-a', password_hash: await hashPassword('senha-da-ana') }, { id: 'user-b', password_hash: 'x:y' }] };
  const handler = (sql, params) => {
    const text = sql.replace(/\s+/g, ' ').trim();
    const rows = list => ({ rows: list, rowCount: list.length });
    if (/^INSERT INTO progress_photos/.test(text)) {
      if (failInsert) throw new Error('banco indisponível');
      const [id, user_id, storage_path, angle, weight, taken_at] = params; db.photos.push({ id, user_id, storage_path, angle, weight, taken_at }); return;
    }
    if (/^SELECT id, storage_path, angle, weight, taken_at FROM progress_photos/.test(text)) return rows(db.photos.filter(p => p.user_id === params[0]));
    if (/^DELETE FROM progress_photos WHERE id = \$1 AND user_id = \$2/.test(text)) {
      const found = db.photos.filter(p => p.id === params[0] && p.user_id === params[1]); db.photos = db.photos.filter(p => !found.includes(p)); return rows(found.map(p => ({ storage_path: p.storage_path })));
    }
    if (/^SELECT storage_path FROM progress_photos WHERE user_id/.test(text)) return rows(db.photos.filter(p => p.user_id === params[0]));
    if (/^SELECT password_hash FROM users/.test(text)) return rows(db.users.filter(u => u.id === params[0]));
    if (/^DELETE FROM users WHERE id/.test(text)) { db.users = db.users.filter(u => u.id !== params[0]); db.photos = db.photos.filter(p => p.user_id !== params[0]); return; }
    throw new Error(`SQL não simulado: ${text.slice(0, 70)}`);
  };
  const server = await startServer(createApp({ pool: fakePool(handler, { 'token-a': { id: 'user-a' }, 'token-b': { id: 'user-b' } }), storage, trustProxy: false }));
  return { db, storage, server };
}

test('envio valida assinatura, tamanho e ângulo e guarda no caminho da própria conta', async () => {
  const { db, storage, server } = await setup();
  try {
    const ok = await server.call('POST', '/api/photos', { token: 'token-a', body: { imageBase64: JPEG, angle: 'front', weight: 62.5 } });
    assert.equal(ok.status, 201);
    assert.match(db.photos[0].storage_path, /^user-a\/[0-9a-f-]{36}\.jpg$/);
    assert.equal(storage.files.get(db.photos[0].storage_path).type, 'image/jpeg');
    assert.match(ok.body.photo.url, /^https:\/\/storage\.test\/sign\//);
    assert.equal((await server.call('POST', '/api/photos', { token: 'token-a', body: { imageBase64: PNG, angle: 'side' } })).status, 201);
    assert.ok(db.photos[1].storage_path.endsWith('.png'), 'tipo detectado pelo conteúdo');
    for (const body of [
      { imageBase64: Buffer.from('<svg onload=alert(1)>').toString('base64'), angle: 'front' },
      { imageBase64: JPEG, angle: 'top' },
      { imageBase64: JPEG, angle: 'front', weight: 999 },
      { imageBase64: 'não é base64', angle: 'front' },
      { imageBase64: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4 * 1024 * 1024)]).toString('base64'), angle: 'front' },
    ]) assert.equal((await server.call('POST', '/api/photos', { token: 'token-a', body })).status, 400);
  } finally { await server.close(); }
});

test('cada conta vê e apaga apenas as próprias fotos', async () => {
  const { db, storage, server } = await setup();
  try {
    const created = await server.call('POST', '/api/photos', { token: 'token-a', body: { imageBase64: JPEG, angle: 'front' } });
    const id = created.body.photo.id;
    assert.deepEqual((await server.call('GET', '/api/photos', { token: 'token-b' })).body.photos, []);
    assert.equal((await server.call('DELETE', `/api/photos/${id}`, { token: 'token-b' })).status, 404);
    assert.equal((await server.call('GET', '/api/photos', { token: 'token-a' })).body.photos.length, 1);
    assert.equal((await server.call('DELETE', `/api/photos/${id}`, { token: 'token-a' })).status, 204);
    assert.equal(db.photos.length, 0);
    assert.equal(storage.files.size, 0, 'arquivo removido do bucket');
  } finally { await server.close(); }
});

test('falha ao gravar no banco remove o arquivo enviado; sem configuração responde 503', async () => {
  const storage = fakeStorage();
  const { server } = await setup({ storage, failInsert: true });
  const original = console.error; console.error = () => {};
  try {
    assert.equal((await server.call('POST', '/api/photos', { token: 'token-a', body: { imageBase64: JPEG, angle: 'front' } })).status, 500);
    assert.equal(storage.files.size, 0);
  } finally { console.error = original; await server.close(); }
  const off = await setup({ storage: { enabled: false } });
  try {
    const result = await off.server.call('GET', '/api/photos', { token: 'token-a' });
    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'STORAGE_DISABLED');
  } finally { await off.server.close(); }
});

test('excluir a conta apaga as fotos do bucket', async () => {
  const { storage, server } = await setup();
  try {
    await server.call('POST', '/api/photos', { token: 'token-a', body: { imageBase64: JPEG, angle: 'front' } });
    await server.call('POST', '/api/photos', { token: 'token-b', body: { imageBase64: JPEG, angle: 'back' } });
    assert.equal(storage.files.size, 2);
    assert.equal((await server.call('DELETE', '/api/account', { token: 'token-a', body: { password: 'senha-da-ana', confirm: 'EXCLUIR' } })).status, 204);
    assert.deepEqual([...storage.files.keys()].map(p => p.split('/')[0]), ['user-b']);
  } finally { await server.close(); }
});

test('cliente do Supabase Storage monta as chamadas REST e detecta tipos', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/object/sign/')) return { ok: true, json: async () => [{ path: 'u/1.jpg', signedURL: '/object/sign/progress-photos/u/1.jpg?token=t' }] };
    return { ok: true, text: async () => '' };
  };
  const storage = createStorage({ url: 'https://abc.supabase.co/', serviceKey: 'service', fetchImpl });
  assert.equal(storage.enabled, true);
  await storage.upload('u/1.jpg', Buffer.from(JPEG, 'base64'), 'image/jpeg');
  assert.equal(calls[0].url, 'https://abc.supabase.co/storage/v1/object/progress-photos/u/1.jpg');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer service');
  const urls = await storage.signedUrls(['u/1.jpg']);
  assert.equal(urls.get('u/1.jpg'), 'https://abc.supabase.co/storage/v1/object/sign/progress-photos/u/1.jpg?token=t');
  await storage.remove(['u/1.jpg']);
  assert.deepEqual(JSON.parse(calls[2].init.body), { prefixes: ['u/1.jpg'] });
  assert.equal(createStorage({ url: '', serviceKey: '' }).enabled, false);
  assert.equal(detectImageType(Buffer.from('GIF89a')), null);
});
