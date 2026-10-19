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

// Confere a assinatura do arquivo em vez de confiar no tipo informado pelo app.
function detectImageType(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

module.exports = { createStorage, detectImageType };
