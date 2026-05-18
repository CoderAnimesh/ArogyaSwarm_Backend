const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  const res = await sql`SELECT id, problem, details, ai_summary FROM appointments ORDER BY id DESC LIMIT 5`;
  console.log(res);
}
check();
