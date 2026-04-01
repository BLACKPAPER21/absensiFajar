const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const shouldUseSSL = process.env.PGSSLMODE !== 'disable';
const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false';

if (!connectionString) {
  console.error('Error: SUPABASE_DB_URL / DATABASE_URL is not defined.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized } : false
});

async function main() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const email = 'admin@company.com';
    const name = 'Super Admin';
    const role = 'admin';

    const client = await pool.connect();

    console.log(`Seeding admin user (${email})...`);

    // Upsert admin user
    const res = await client.query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET password_hash = $3, name = $2
       RETURNING id, email`,
      [email, name, hashedPassword, role]
    );

    console.log('Admin user seeded successfully:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    await pool.end();
  }
}

main();
