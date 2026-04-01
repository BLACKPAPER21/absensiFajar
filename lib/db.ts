import { Pool } from "pg";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Database URL is missing. Set SUPABASE_DB_URL or DATABASE_URL.");
}

const shouldUseSSL = process.env.PGSSLMODE !== "disable";
const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED !== "false";

const pool = new Pool({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized } : false,
});

export default pool;
