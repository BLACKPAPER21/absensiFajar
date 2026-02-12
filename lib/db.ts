import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Timescale/Tiger Cloud self-signed certs
  },
});

export default pool;
