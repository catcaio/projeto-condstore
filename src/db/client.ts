import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool?: mysql.Pool;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize the database client.");
}

const pool =
  globalForDb.pool ??
  mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 10,
    multipleStatements: false,
    timezone: "Z",
    ssl: { rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { mode: "default" });
