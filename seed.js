// ============================================================
// SEED SCRIPT — Arogya-Swarm HMS
// Creates test credentials for admin, doctor, and ASHA worker
// Run: node seed.js
// ============================================================
require('dotenv').config();
const bcrypt = require('bcrypt');
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { users, medicines } = require('./db/schema');
const { eq } = require('drizzle-orm');

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema: require('./db/schema') });

async function seed() {
  console.log('🌱 Starting seed...\n');

  const accounts = [
    { name: 'Admin',             email: 'admin@admin.com',         password: 'admin123',       role: 'admin',   speciality: null },
    { name: 'Dr. Nitish Pandey', email: 'nitish@gmail.com',        password: 'nitish@123',     role: 'doctor',  speciality: 'General Physician' },
    { name: 'Shakuntala Devi',   email: 'shakuntala@gmail.com',    password: 'shakuntala@123', role: 'asha',    speciality: null },
  ];

  for (const acc of accounts) {
    // Skip if already exists
    const existing = await db.select().from(users).where(eq(users.email, acc.email));
    if (existing.length > 0) {
      console.log(`⚠️  Skipped (already exists): ${acc.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(acc.password, 10);
    await db.insert(users).values({
      name: acc.name,
      email: acc.email,
      password: hashed,
      role: acc.role,
      speciality: acc.speciality,
    });
    console.log(`✅ Created [${acc.role}]: ${acc.email} / ${acc.password}`);
  }

  // Seed some medicines
  const meds = [
    { name: 'Paracetamol 500mg',   stock: 200, description: 'Pain and fever relief' },
    { name: 'Amoxicillin 250mg',   stock: 150, description: 'Antibiotic for bacterial infections' },
    { name: 'Ibuprofen 400mg',     stock: 100, description: 'Anti-inflammatory and pain relief' },
    { name: 'Cetirizine 10mg',     stock: 80,  description: 'Antihistamine for allergies' },
    { name: 'Omeprazole 20mg',     stock: 120, description: 'Acid reflux and stomach ulcers' },
  ];

  console.log('\n💊 Seeding medicines...');
  for (const med of meds) {
    const existing = await db.select().from(medicines).where(eq(medicines.name, med.name));
    if (existing.length > 0) {
      console.log(`⚠️  Skipped (already exists): ${med.name}`);
      continue;
    }
    await db.insert(medicines).values(med);
    console.log(`✅ Added medicine: ${med.name} (stock: ${med.stock})`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('  Test Credentials:');
  console.log('  Admin  : admin@admin.com     / admin123');
  console.log('  Doctor : nitish@gmail.com    / nitish@123');
  console.log('  ASHA   : shakuntala@gmail.com / shakuntala@123');
  console.log('  Patient: Register via /register page');
  console.log('─────────────────────────────────────────\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
