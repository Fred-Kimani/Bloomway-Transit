const mysql = require('mysql2/promise');

async function initializeDB() {
  try {
    // Connect without database first to ensure database exists
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS `bloomway-transit`');
    await connection.query('USE `bloomway-transit`');

    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await connection.query(createUsersTableQuery);

    // Ensure is_approved exists for existing databases
    try {
      await connection.query('ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT true');
    } catch (error) {
      if (error && error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Approve all existing admins by default
    await connection.query('UPDATE users SET is_approved = true WHERE is_approved IS NULL');

    const createResetTokensTableQuery = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        purpose VARCHAR(20) NOT NULL DEFAULT 'reset',
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (token_hash),
        INDEX (user_id)
      )
    `;

    await connection.query(createResetTokensTableQuery);

    const createContactTableQuery = `
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_method VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        message VARCHAR(1000) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await connection.query(createContactTableQuery);
    console.log("Database tables initialized successfully!");
    
    await connection.end();
  } catch (error) {
    console.error("Failed to initialize database. Make sure MySQL is running via XAMPP/MAMP.", error);
  }
}

initializeDB();
