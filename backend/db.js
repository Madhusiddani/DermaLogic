// backend/db.js
// This file connects our app to PostgreSQL database

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
// Pool manages multiple database connections efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection when app starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release(); // Release the test connection back to pool
  }
});

module.exports = pool;