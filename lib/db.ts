import { Pool } from "pg";

// Force disable SSL validation for self-signed certs (Tiger Data)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true, // simplified
});

export default pool;
