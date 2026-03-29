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
  port: Number(requireEnv('DB_PORT') || 3306),
  user: requireEnv('DB_USER') || 'root',
  password: requireEnv('DB_PASSWORD') || '',
  database: requireEnv('DB_NAME') || 'bloomway-transit',
  ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true'
    ? {
        rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true',
      }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
});

module.exports = pool;
