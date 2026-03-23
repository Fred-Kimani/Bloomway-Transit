const mysql = require('mysql2/promise');

async function createContactTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bloomway-transit'
    });

    const createTableQuery = `
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
    
    await connection.query(createTableQuery);
    console.log("Contact messages table created successfully!");
    
    await connection.end();
  } catch (error) {
    console.error("Failed to create table:", error);
  }
}

createContactTable();
