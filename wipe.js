const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function wipe() {
  const sql = neon(process.env.DATABASE_URL);
  console.log('Dropping schema public cascade...');
  await sql`DROP SCHEMA public CASCADE;`;
  console.log('Creating schema public...');
  await sql`CREATE SCHEMA public;`;
  console.log('Done!');
}
wipe().catch(console.error);
