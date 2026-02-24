import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");

const reps = [
  [/from\s+['"][.\/\\]+infra\/db['"]/g, "from '@/infra/db'"],
  [/from\s+['"][.\/\\]+infra\/auth\/session['"]/g, "from '@/infra/auth/session'"],
  [/from\s+['"][.\/\\]+infra\/logger['"]/g, "from '@/infra/logger'"],
  [/from\s+['"][.\/\\]+infra\/redis\.client['"]/g, "from '@/infra/redis.client'"],
];

function patchFile(filePath) {
  let s = fs.readFileSync(filePath, "utf8");
  for (const [re, to] of reps) s = s.replace(re, to);
  fs.writeFileSync(filePath, s, "utf8");
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile() && e.name.endsWith(".ts")) patchFile(full);
  }
}

if (fs.existsSync(apiDir)) walk(apiDir);
