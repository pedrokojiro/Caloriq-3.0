require('dotenv').config({ quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('./db');

async function migrate() {
  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Banco Caloriq preparado com sucesso.');
}

migrate()
  .catch((error) => {
    console.error('Não foi possível preparar o banco:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
