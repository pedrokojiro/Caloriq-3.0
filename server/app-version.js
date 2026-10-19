// Informa ao app qual é a versão mais recente do APK e onde baixá-la.
// Configurado por variáveis de ambiente para publicar uma versão sem novo deploy de código.

function readVersionConfig(env = process.env) {
  const latestVersionCode = Number.parseInt(env.APP_LATEST_VERSION_CODE || '', 10);
  const downloadUrl = String(env.APP_DOWNLOAD_URL || '').trim();
  if (!Number.isInteger(latestVersionCode) || latestVersionCode < 1 || !/^https:\/\//i.test(downloadUrl)) return null;
  const minVersionCode = Number.parseInt(env.APP_MIN_VERSION_CODE || '', 10);
  return {
    latestVersion: String(env.APP_LATEST_VERSION || '').trim().slice(0, 20) || String(latestVersionCode),
    latestVersionCode,
    minVersionCode: Number.isInteger(minVersionCode) && minVersionCode > 0 ? Math.min(minVersionCode, latestVersionCode) : 0,
    downloadUrl,
    notes: String(env.APP_RELEASE_NOTES || '').trim().slice(0, 500),
  };
}

function registerAppVersion(app, { env = process.env } = {}) {
  app.get('/api/app/version', (_request, response) => {
    response.set('Cache-Control', 'public, max-age=300');
    const config = readVersionConfig(env);
    response.json(config ? { available: true, ...config } : { available: false });
  });
}

module.exports = { registerAppVersion, readVersionConfig };
