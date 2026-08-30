const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Erro inesperado no PostgreSQL:', error);
});

module.exports = { pool };
