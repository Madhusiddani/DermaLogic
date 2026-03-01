// backend/scripts/createTables.js
// Run this ONCE to create tables: node scripts/createTables.js

const pool = require('../db');

async function createTables() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ users table created (or already exists)');

    // Create analysis table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        image_url   TEXT,
        result      TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ analysis table created (or already exists)');

    console.log('🎉 All tables ready!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    process.exit(1);
  }
}

createTables();