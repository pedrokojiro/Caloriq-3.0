const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { readVersionConfig } = require('./app-version');
const { fakePool, startServer } = require('./test-helpers');

test('configuração de versão exige versionCode e link HTTPS', () => {
  assert.equal(readVersionConfig({}), null);
  assert.equal(readVersionConfig({ APP_LATEST_VERSION_CODE: '6', APP_DOWNLOAD_URL: 'http://inseguro.com/app.apk' }), null);
  assert.deepEqual(readVersionConfig({ APP_LATEST_VERSION: '1.4.0', APP_LATEST_VERSION_CODE: '6', APP_MIN_VERSION_CODE: '9', APP_DOWNLOAD_URL: 'https://expo.dev/a/x', APP_RELEASE_NOTES: 'Recuperação de senha' }),
    { latestVersion: '1.4.0', latestVersionCode: 6, minVersionCode: 6, downloadUrl: 'https://expo.dev/a/x', notes: 'Recuperação de senha' }, 'mínimo nunca passa da última versão');
});

test('rota de versão é pública e responde mesmo sem configuração', async () => {
  const configured = await startServer(createApp({ pool: fakePool(() => undefined), env: { APP_LATEST_VERSION_CODE: '6', APP_DOWNLOAD_URL: 'https://expo.dev/a/x' } }));
  const empty = await startServer(createApp({ pool: fakePool(() => undefined), env: {} }));
  try {
    const result = await configured.call('GET', '/api/app/version');
    assert.equal(result.status, 200);
    assert.equal(result.body.available, true);
    assert.equal(result.body.latestVersionCode, 6);
    assert.deepEqual((await empty.call('GET', '/api/app/version')).body, { available: false });
  } finally { await configured.close(); await empty.close(); }
});
