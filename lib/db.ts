import { Pool } from "pg";

// Required for Timescale/Tiger Cloud self-signed certificates
// This MUST be set before any TLS connections are made
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
