const mysql = require('mysql2/promise');

async function createCmsTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bloomway-transit'
    });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
          id VARCHAR(36) PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) UNIQUE NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          size_bytes INTEGER NOT NULL,
          alt_text VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pages (
          id VARCHAR(36) PRIMARY KEY,
          slug VARCHAR(100) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          meta_description TEXT,
          is_published BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sections (
          id VARCHAR(36) PRIMARY KEY,
          page_id VARCHAR(36) NOT NULL,
          name VARCHAR(100) NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE(page_id, name),
          FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS content_blocks (
          id VARCHAR(36) PRIMARY KEY,
          section_id VARCHAR(36) NOT NULL,
          block_key VARCHAR(100) NOT NULL,
          content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('text', 'rich_text', 'image', 'boolean')),
          text_value TEXT,
          media_asset_id VARCHAR(36) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE(section_id, block_key),
          FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
          FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
      )
    `);

    console.log("CMS tables created successfully!");
    
    await connection.end();
  } catch (error) {
    console.error("Failed to create tables:", error);
  }
}

createCmsTables();
