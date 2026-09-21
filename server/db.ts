import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let pool: any = null;
let db: any = null;
let isMock = false;

// Attempt database connection if configured via DATABASE_URL or SQL_HOST
if (process.env.SQL_HOST) {
  pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  db = drizzle(pool, { schema });
} else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("@host:")) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  });
  db = drizzle(pool, { schema });
} else if (process.env.NODE_ENV === "development") {
  console.warn("[Database] No PostgreSQL config found — development fallback enabled");
  isMock = true;
} else {
  // In production / Cloudflare Worker context, D1 is required
  console.log("[Database] Operating in Cloudflare Worker / D1 mode");
}

export { pool, db, isMock };
