const path = require('node:path');
const { fork, spawn } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { Client } = require('pg');
const root = path.join(__dirname, '..');
let api;
let expo;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  expo?.kill();
  api?.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL no .env. Consulte APRESENTACAO.md para preparar este notebook.');
    process.exitCode = 1;
    return;
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, query_timeout: 5000 });
  try {
    await db.connect();
    await db.query('SELECT 1 FROM users LIMIT 1');
    await db.query('SELECT 1 FROM meals LIMIT 1');
    console.log('PostgreSQL conectado e tabelas encontradas.');
  } catch {
    console.error('Banco não está pronto. Ligue o PostgreSQL, confira DATABASE_URL e execute npm run db:setup.');
    process.exitCode = 1;
    return;
  } finally { await db.end(); }
  if (stopping) return;
  if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) console.log('Aviso: chave Gemini ausente. A análise real não funcionará.');
  api = fork(path.join(root, 'server/index.js'), [], {
    // Stable across restarts: cached Expo bundles must not point to a retired random port.
    cwd: root, env: { ...process.env, API_PORT: '3333' },
  });
  const timeout = setTimeout(() => { console.error('A API demorou para iniciar.'); stop(1); }, 10000);
  api.on('error', () => { clearTimeout(timeout); console.error('Falha ao iniciar API.'); stop(1); });
  api.on('exit', () => { clearTimeout(timeout); if (!stopping) stop(1); });
  api.once('message', (message) => {
    clearTimeout(timeout);
    if (stopping) return;
    if (message.type !== 'ready' || !Number.isInteger(message.port)) { stop(1); return; }
    console.log('API na porta fixa 3333. O endereço do notebook continua automático.');
    console.log('No app, apague qualquer endereço manual com porta antiga e salve. Conecte ambos à mesma rede.');
    console.log('Mantenha este terminal aberto. Ctrl+C encerra app e API iniciados aqui.');
    const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin/cli');
    expo = spawn(process.execPath, [cli, 'start', '--lan', '--clear'], {
      cwd: root, stdio: 'inherit',
      env: { ...process.env, EXPO_PUBLIC_API_URL: 'auto', EXPO_PUBLIC_API_PORT: String(message.port) },
    });
    expo.on('error', () => { console.error('Não foi possível iniciar Expo.'); stop(1); });
    expo.on('exit', (code) => stop(code ?? 0));
  });
}
start().catch(() => { console.error('Falha na preparação. Confira as dependências e APRESENTACAO.md.'); stop(1); });
