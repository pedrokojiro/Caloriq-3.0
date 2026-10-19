// Fotos de progresso guardadas no Supabase Storage (opcional para o usuário).
const { randomUUID } = require('node:crypto');
const { detectImageType } = require('./storage');
const { FixedWindowLimiter, rateLimit } = require('./rate-limit');

const MAX_BYTES = 4 * 1024 * 1024;
const ANGLES = new Set(['front', 'side', 'back']);
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function registerPhotos(app, { pool, storage, limits }) {
  const uploadLimiter = new FixedWindowLimiter(limits.photoUpload);
  const disabled = response => response.status(503).json({ error: 'O armazenamento de fotos na nuvem não está configurado no servidor.', code: 'STORAGE_DISABLED' });

  app.get('/api/photos', async (request, response, next) => {
    if (!storage.enabled) return disabled(response);
    try {
      const result = await pool.query(
        'SELECT id, storage_path, angle, weight, taken_at FROM progress_photos WHERE user_id = $1 ORDER BY taken_at DESC',
        [request.userId]
      );
      const urls = await storage.signedUrls(result.rows.map(row => row.storage_path));
      response.set('Cache-Control', 'no-store');
      response.json({
        photos: result.rows.filter(row => urls.has(row.storage_path)).map(row => ({
          id: row.id, url: urls.get(row.storage_path), angle: row.angle,
          weight: row.weight === null ? undefined : Number(row.weight), createdAt: new Date(row.taken_at).toISOString(),
        })),
      });
    } catch (error) { next(error); }
  });

  app.post('/api/photos', rateLimit(uploadLimiter, request => request.userId, 'Muitas fotos enviadas agora. Tente novamente em alguns minutos.'), async (request, response, next) => {
    if (!storage.enabled) return disabled(response);
    const body = request.body || {};
    if (!ANGLES.has(body.angle)) return response.status(400).json({ error: 'Ângulo da foto inválido.' });
    const weight = body.weight === undefined || body.weight === null ? null : Number(body.weight);
    if (weight !== null && (!Number.isFinite(weight) || weight < 30 || weight > 350)) return response.status(400).json({ error: 'Peso inválido.' });
    const takenAt = body.takenAt ? new Date(String(body.takenAt)) : new Date();
    if (Number.isNaN(takenAt.getTime()) || takenAt.getTime() > Date.now() + 86_400_000) return response.status(400).json({ error: 'Data da foto inválida.' });
    const encoded = typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:image\/[a-z]+;base64,/i, '') : '';
    if (!encoded || encoded.length > Math.ceil(MAX_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      return response.status(400).json({ error: 'A foto deve ter até 4 MB.' });
    }
    const bytes = Buffer.from(encoded, 'base64');
    const type = detectImageType(bytes);
    if (!type || bytes.length > MAX_BYTES) return response.status(400).json({ error: 'Envie uma foto JPG, PNG ou WebP de até 4 MB.' });
    const id = randomUUID();
    const path = `${request.userId}/${id}.${EXTENSIONS[type]}`;
    try {
      await storage.upload(path, bytes, type);
      try {
        await pool.query('INSERT INTO progress_photos (id, user_id, storage_path, angle, weight, taken_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [id, request.userId, path, body.angle, weight, takenAt]);
      } catch (error) {
        await storage.remove([path]).catch(() => undefined);
        throw error;
      }
      const urls = await storage.signedUrls([path]);
      response.status(201).json({ photo: { id, url: urls.get(path), angle: body.angle, weight: weight ?? undefined, createdAt: takenAt.toISOString() } });
    } catch (error) { next(error); }
  });

  app.delete('/api/photos/:id', async (request, response, next) => {
    if (!storage.enabled) return disabled(response);
    try {
      const result = await pool.query('DELETE FROM progress_photos WHERE id = $1 AND user_id = $2 RETURNING storage_path', [request.params.id, request.userId]);
      if (!result.rowCount) return response.status(404).json({ error: 'Foto não encontrada.' });
      await storage.remove([result.rows[0].storage_path]).catch(error => console.error('Arquivo da foto não removido:', error.message));
      response.status(204).end();
    } catch (error) { next(error); }
  });
}

// Usado na exclusão da conta: as linhas somem por cascata, os arquivos precisam ser apagados à parte.
async function collectUserPhotoPaths(pool, userId) {
  const result = await pool.query('SELECT storage_path FROM progress_photos WHERE user_id = $1', [userId]);
  return result.rows.map(row => row.storage_path);
}

module.exports = { registerPhotos, collectUserPhotoPaths, MAX_BYTES };
