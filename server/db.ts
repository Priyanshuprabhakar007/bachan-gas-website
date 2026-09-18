
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let pool: any;
let db: any;

try {
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
  } else {
    throw new Error("No database configuration found (neither SQL_HOST nor DATABASE_URL)");
  }
} catch (e: any) {
  console.warn("[AI Studio] PostgreSQL not connected — using mock/in-memory data layer fallback");
  pool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    }),
    on: () => {},
  };
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };
  const chainable: any = () => chainable;
  chainable.from = () => chainable;
  chainable.where = () => chainable;
  chainable.orderBy = () => chainable;
  chainable.limit = () => chainable;
  chainable.values = () => chainable;
  chainable.set = () => chainable;
  chainable.returning = () => Promise.resolve([]);
  chainable.then = (resolve: any) => Promise.resolve([]).then(resolve);
  chainable.catch = (reject: any) => Promise.resolve([]).catch(reject);

  db = new Proxy({}, {
    get: (_, prop) => {
      if (prop === "query") return new Proxy({}, { get: () => noOp });
      if (prop === "transaction") return async (cb: any) => cb(db);
      if (prop === "select" || prop === "insert" || prop === "update" || prop === "delete") {
        return () => chainable;
      }
      return async () => [];
    },
  });
}

export { pool, db };

