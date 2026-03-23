const mysql = require('mysql2/promise');

const isProd = process.env.NODE_ENV === 'production';

function requireEnv(name) {
  const value = process.env[name];
  if (isProd && (!value || String(value).trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const pool = mysql.createPool({
  host: requireEnv('DB_HOST') || 'localhost',
  user: requireEnv('DB_USER') || 'root',
  password: requireEnv('DB_PASSWORD') || '',
  database: requireEnv('DB_NAME') || 'bloomway-transit',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
