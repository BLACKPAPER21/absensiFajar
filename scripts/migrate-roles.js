const { Pool } = require('pg');
const path = require('path');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Explicitly load .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not defined.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration for Dynamic Roles...');

    // 1. Create Roles Table
    console.log('Creating roles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed Default Roles
    console.log('Seeding default roles...');
    await client.query(`
      INSERT INTO roles (name, is_default)
      VALUES
        ('admin', true),
        ('employee', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // 3. Drop CHECK constraint on users.role
    // We need to find the constraint name first, but usually it's auto-generated.
    // simpler approach: ALTER COLUMN TYPE (which effectively drops old checks usually) or DROP CONSTRAINT explicitly if known.
    // Since we created it in setup-db.js with "CHECK (role IN ...)", it might be an anonymous constraint.
    // We will attempt to drop the constraint by name if we can guess it, or just ALTER to drop check.

    // Attempting to drop constraint by finding it first
    console.log('Removing constraint on users.role...');
    const constraintRes = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
      AND contype = 'c';
    `);

    if (constraintRes.rows.length > 0) {
        for (const row of constraintRes.rows) {
            console.log(`Dropping constraint: ${row.conname}`);
            await client.query(`ALTER TABLE users DROP CONSTRAINT "${row.conname}"`);
        }
    } else {
        console.log("No CHECK constraints found on users table (maybe already removed).");
    }

    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
