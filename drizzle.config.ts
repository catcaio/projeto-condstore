import { defineConfig } from "drizzle-kit";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const rawUrl = process.env.DATABASE_URL || "";
let connectionString = rawUrl;

try {
  if (rawUrl) {
    const url = new URL(rawUrl);
    url.search = "";
    connectionString = url.toString();
  }
} catch (e) {}

const caPath = path.resolve("./certs/ca.pem");
const sslConfig = fs.existsSync(caPath)
  ? { ssl: { ca: fs.readFileSync(caPath, "utf-8") } }
  : { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } };

let dbCredentials: any = { url: connectionString };

try {
  if (connectionString) {
    const url = new URL(connectionString);
    dbCredentials = {
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, ""),
      ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }
    };
  }
} catch (e) {}

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials
});
