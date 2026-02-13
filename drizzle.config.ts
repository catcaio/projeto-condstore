import { defineConfig } from "drizzle-kit";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const caPath = path.resolve("./certs/ca.pem");
const sslConfig = fs.existsSync(caPath)
  ? { ssl: { ca: fs.readFileSync(caPath, "utf-8") } }
  : { ssl: true };

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
    ...sslConfig,
  },
});
