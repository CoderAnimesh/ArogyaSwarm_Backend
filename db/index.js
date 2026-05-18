const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const schema = require('./schema.js');
require('dotenv').config();

// Connect to Neon
// Note: In development without configuring the URL initially, this might throw.
const sql = neon(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hms');
const db = drizzle(sql, { schema });

module.exports = { db };
