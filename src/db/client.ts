import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Prevent multiple pools in development due to HMR
const globalForDb = globalThis as unknown as {
  pool?: mysql.Pool;
};

/**
 * Lazy database client — only initializes when first called at runtime.
 * This prevents Next.js build from crashing in CI where DATABASE_URL is not set.
 */
export function getDb() {
  if (!globalForDb.pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is required at runtime to initialize the database client."
      );
    }
    globalForDb.pool = mysql.createPool({
      uri: databaseUrl,
      connectionLimit: 10,
      multipleStatements: false,
      timezone: "Z",
      ssl: { rejectUnauthorized: true },
    });
  }
  return drizzle(globalForDb.pool, { mode: "default" });
}

/**
 * @deprecated Use getDb() instead — this eager export crashes CI builds.
 * Kept temporarily for backward compatibility with modules not yet migrated.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
