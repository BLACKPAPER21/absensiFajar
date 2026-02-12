const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Force disable SSL validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not defined.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
