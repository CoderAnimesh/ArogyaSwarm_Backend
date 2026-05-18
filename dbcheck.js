require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log('Tables:', tables.map(t => t.table_name));
  
  if (tables.some(t => t.table_name === 'users')) {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='users'`;
    console.log('Users columns:', cols.map(c => c.column_name));
  }
}
check().catch(console.error);
