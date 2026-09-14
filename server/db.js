const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || '';
const isLocalDatabase = /(?:localhost|127\.0\.0\.1)/i.test(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  // O pool IPv4 do Supabase usa uma cadeia de certificados gerenciada pelo
  // provedor. A conexão continua criptografada, mas não depende da CA local
  // instalada na máquina ou no contêiner do Render.
  ssl: databaseUrl && !isLocalDatabase ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Erro inesperado no PostgreSQL:', error);
});

module.exports = { pool };
