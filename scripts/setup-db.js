const { Pool } = require('pg');
const path = require('path');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Explicitly load .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

console.log('Checking DATABASE_URL...');

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not defined. Env content:', process.env);
  process.exit(1);
} else {
  console.log('DATABASE_URL found (length: ' + process.env.DATABASE_URL.length + ')');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'employee')),
    face_descriptor JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    location_lat DECIMAL,
    location_lng DECIMAL,
    selfie_url TEXT,
    status VARCHAR(50) CHECK (status IN ('on_time', 'late', 'absent')),
    confidence_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Seed Default Settings if they don't exist
  INSERT INTO settings (key, value)
  VALUES
    ('company_name', 'Fajar Tech Solutions'),
    ('check_in_radius', '100'),
    ('late_tolerance', '15'),
    ('office_start_time', '09:00 AM'),
    ('office_end_time', '05:00 PM')
  ON CONFLICT (key) DO NOTHING;

  -- Create a default admin if not exists (password: 'admin123' - mocked hash for now)
  INSERT INTO users (email, name, password_hash, role)
  VALUES ('admin@company.com', 'Super Admin', '$2a$10$mockhashadmin123', 'admin')
  ON CONFLICT (email) DO NOTHING;
`;

async function setupDatabase() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected. creating tables...');
    await client.query(schema);
    console.log('Tables created successfully!');
    client.release();
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    await pool.end();
  }
}

setupDatabase();
