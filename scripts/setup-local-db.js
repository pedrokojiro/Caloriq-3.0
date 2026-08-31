// Creates a local database; never removes an existing database or its records.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');

async function setup() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL no .env com a senha do PostgreSQL deste notebook.');
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Este comando prepara apenas um PostgreSQL local. Use localhost em DATABASE_URL.');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(database)) throw new Error('Nome de banco inválido em DATABASE_URL.');
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    await admin.connect();
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (!existing.rowCount) await admin.query(`CREATE DATABASE "${database}"`);
  } finally { await admin.end(); }
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const existing = await client.query("SELECT to_regclass('public.users') AS table_name");
    if (!existing.rows[0].table_name) {
      await client.query(await fs.readFile(path.join(__dirname, '../server/schema.sql'), 'utf8'));
      console.log('Banco e tabelas criados com os exemplos iniciais.');
    } else {
      console.log('Banco já preparado. Dados existentes preservados; exemplos não foram recriados.');
    }
  } finally { await client.end(); }
}

setup().catch(() => {
  console.error('Não foi possível preparar o banco. Confira DATABASE_URL no .env, serviço PostgreSQL e permissão do usuário para criar bancos. Nenhuma senha foi exibida.');
  process.exitCode = 1;
});
