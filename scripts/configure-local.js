const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const dotenv = require('dotenv');

function replaceSetting(source, name, value) {
  // Configuration values written here are single-line and have no dotenv comment delimiters.
  if (/[\r\n#]/.test(value)) throw new Error('Valor inválido');
  const expression = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*$`, 'gm');
  let found = false;
  const replaced = source.replace(expression, () => {
    if (found) return '';
    found = true;
    return `${name}=${value}`;
  });
  return found ? replaced : `${source}${source.endsWith('\n') || !source ? '' : '\n'}${name}=${value}\n`;
}

function connectionUrl(user, password, port, database) {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Porta inválida');
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(database)) throw new Error('Nome de banco inválido');
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:${port}/${database}`;
}

async function configure() {
  const filename = path.join(__dirname, '../.env');
  let source = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
  const current = dotenv.parse(source);
  const force = process.argv.includes('--editar');
  const needsKey = force || !current.EXPO_PUBLIC_GEMINI_API_KEY || /sua_chave|COLE_SUA|SUA_API/i.test(current.EXPO_PUBLIC_GEMINI_API_KEY);
  const needsDatabase = force || !current.DATABASE_URL || /troque_esta_senha/.test(current.DATABASE_URL);
  if ((needsKey || needsDatabase) && !process.stdin.isTTY) throw new Error('Abra o configurador em um terminal interativo.');
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
  const rl = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
  rl.on('SIGINT', () => { muted = false; process.stdout.write('\nConfiguração cancelada.\n'); process.exit(1); });
  async function ask(prompt, fallback) {
    return (await rl.question(`${prompt} [${fallback}]: `)).trim() || fallback;
  }
  async function secret(prompt) {
    process.stdout.write(`${prompt} (entrada oculta; cole e pressione Enter): `);
    muted = true;
    try { return await rl.question(''); }
    finally { muted = false; process.stdout.write('\n'); }
  }
  try {
    if (needsKey) {
      const key = (await secret('Chave Gemini do AI Studio — Enter para configurar depois na tela do app')).trim();
      if (key && !/^[A-Za-z0-9_.-]{20,}$/.test(key)) throw new Error('Formato inválido.');
      source = replaceSetting(source, 'EXPO_PUBLIC_GEMINI_API_KEY', key);
    }
    if (needsDatabase) {
      console.log('Informe os dados do PostgreSQL instalado NESTE notebook.');
      const user = await ask('Usuário', 'postgres');
      const port = await ask('Porta', '5432');
      const database = await ask('Nome do banco', 'caloriq');
      const password = await secret('Senha do PostgreSQL');
      if (!password) throw new Error('Senha vazia.');
      source = replaceSetting(source, 'DATABASE_URL', connectionUrl(user, password, port, database));
    }
    if (!current.EXPO_PUBLIC_GEMINI_MODEL) source = replaceSetting(source, 'EXPO_PUBLIC_GEMINI_MODEL', 'gemini-3.6-flash');
    if (!current.EXPO_PUBLIC_AI_DEMO_MODE) source = replaceSetting(source, 'EXPO_PUBLIC_AI_DEMO_MODE', 'false');
    if (!current.EXPO_PUBLIC_API_URL) source = replaceSetting(source, 'EXPO_PUBLIC_API_URL', 'auto');
    if (source !== (fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '')) {
      fs.writeFileSync(filename, source, { mode: 0o600 });
    }
    console.log('Configuração local pronta. Segredos não foram exibidos nem enviados ao GitHub.');
  } finally { rl.close(); }
}

if (require.main === module) configure().catch(() => {
  console.error('Configuração não concluída. Use npm run configurar em um terminal; para corrigir credenciais existentes, npm run configurar -- --editar.');
  process.exitCode = 1;
});
module.exports = { replaceSetting, connectionUrl };
