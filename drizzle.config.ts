import { defineConfig } from "drizzle-kit";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const caPath = path.resolve("./certs/ca.pem");
// Se ca.pem não existir, não sobrescreve SSL — a URL já carrega os params SSL (?ssl=...).
// Passar ssl:true em conflito com o param da URL causava ETIMEDOUT no TiDB Cloud.
const sslConfig = fs.existsSync(caPath)
  ? { ssl: { ca: fs.readFileSync(caPath, "utf-8") } }
  : {};

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
    ...sslConfig,
  },
});
