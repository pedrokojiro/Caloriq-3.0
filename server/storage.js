const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');

// Cliente mínimo do Supabase Storage (API REST), usado para as fotos de progresso.
// O bucket deve ser PRIVADO: as imagens só são entregues por URLs assinadas e temporárias.

function createStorage({ url = process.env.SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY, bucket = process.env.SUPABASE_PHOTOS_BUCKET || 'progress-photos', fetchImpl = fetch } = {}) {
  const base = String(url || '').replace(/\/$/, '');
  const enabled = Boolean(base && serviceKey);
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const objectUrl = path => `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;

  async function expectOk(response, action) {
    if (response.ok) return response;
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase Storage (${action}) respondeu ${response.status}: ${detail.slice(0, 200)}`);
  }

  return {
    enabled,
    async upload(path, bytes, contentType) {
      await expectOk(await fetchImpl(objectUrl(path), {
        method: 'POST', headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'false', 'Cache-Control': 'private, max-age=31536000' }, body: bytes,
      }), 'upload');
    },
    async signedUrls(paths, expiresIn = 3600) {
      if (!paths.length) return new Map();
      const response = await expectOk(await fetchImpl(`${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn, paths }),
      }), 'sign');
      const list = await response.json();
      return new Map(list.filter(item => item.signedURL).map(item => [item.path, `${base}/storage/v1${item.signedURL}`]));
    },
    async remove(paths) {
      if (!paths.length) return;
      await expectOk(await fetchImpl(`${base}/storage/v1/object/${encodeURIComponent(bucket)}`, {
        method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }),
      }), 'remove');
    },
  };
}

// Armazenamento no próprio PostgreSQL: não exige nenhuma chave nem serviço extra. As imagens
// só saem por links assinados (HMAC) e temporários, com a mesma interface do Supabase Storage.
function createDatabaseStorage({ pool, secret: fixedSecret = process.env.PHOTO_SIGNING_SECRET, now = () => Date.now() }) {
  let cachedSecret = fixedSecret ? String(fixedSecret) : null;

  async function secret() {
    if (cachedSecret) return cachedSecret;
    await pool.query('INSERT INTO app_secrets (name, value) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', ['photo-signing', randomBytes(32).toString('hex')]);
    const result = await pool.query('SELECT value FROM app_secrets WHERE name = $1', ['photo-signing']);
    cachedSecret = result.rows[0].value;
    return cachedSecret;
  }
  const sign = async (path, expires) => createHmac('sha256', await secret()).update(`${path}:${expires}`).digest('hex');

  return {
    enabled: true,
    kind: 'database',
    async upload(path, bytes, contentType) {
      await pool.query('INSERT INTO photo_blobs (path, content_type, data) VALUES ($1, $2, $3)', [path, contentType, bytes]);
    },
    async signedUrls(paths, expiresIn = 3600, { baseUrl = '' } = {}) {
      const expires = Math.floor(now() / 1000) + expiresIn;
      const entries = await Promise.all(paths.map(async path => {
        const query = new URLSearchParams({ path, exp: String(expires), sig: await sign(path, expires) });
        return [path, `${String(baseUrl).replace(/\/$/, '')}/photos/file?${query}`];
      }));
      return new Map(entries);
    },
    // Devolve { contentType, data } se a assinatura é válida e não expirou; senão, null.
    async readSigned({ path, exp, sig }) {
      const expires = Number(exp);
      if (!path || !Number.isFinite(expires) || expires * 1000 < now() || typeof sig !== 'string') return null;
      const expected = Buffer.from(await sign(path, expires));
      const given = Buffer.from(sig);
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
      const result = await pool.query('SELECT content_type, data FROM photo_blobs WHERE path = $1', [path]);
      return result.rows[0] ? { contentType: result.rows[0].content_type, data: result.rows[0].data } : null;
    },
    async remove(paths) {
      if (!paths.length) return;
      await pool.query('DELETE FROM photo_blobs WHERE path = ANY($1::text[])', [paths]);
    },
  };
}

// Usa o Supabase Storage quando há chaves; senão, guarda no próprio banco.
function chooseStorage(pool) {
  const supabase = createStorage();
  return supabase.enabled ? supabase : createDatabaseStorage({ pool });
}

// Confere a assinatura do arquivo em vez de confiar no tipo informado pelo app.
function detectImageType(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

module.exports = { createStorage, createDatabaseStorage, chooseStorage, detectImageType };
