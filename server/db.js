const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

const databaseUrl = process.env.DATABASE_URL || '';
const isLocalDatabase = /(?:localhost|127\.0\.0\.1)/i.test(databaseUrl);
const connectionString = databaseUrl.replace(
  /([?&])sslmode=[^&]*(&|$)/i,
  (_match, separator, remainder) => (remainder ? separator : ''),
);
const supabaseRootCertificate = fs.readFileSync(
  path.join(__dirname, 'certs', 'supabase-root-2021.crt'),
  'utf8',
);

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  // Mantém a conexão remota criptografada e valida o servidor usando a CA
  // oficial disponibilizada nas configurações do projeto Supabase.
  ssl: databaseUrl && !isLocalDatabase
    ? { ca: supabaseRootCertificate, rejectUnauthorized: true }
    : false,
});

pool.on('error', (error) => {
  console.error('Erro inesperado no PostgreSQL:', error);
});

module.exports = { pool };
