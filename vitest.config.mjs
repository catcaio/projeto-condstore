import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

if (process.platform === "win32" && !process.env.ESBUILD_BINARY_PATH) {
  const esbuildPath = path.resolve(
    "node_modules",
    "vite",
    "node_modules",
    "@esbuild",
    "win32-x64",
    "esbuild.exe",
  );

  if (fs.existsSync(esbuildPath)) {
    process.env.ESBUILD_BINARY_PATH = esbuildPath;
  }
}

const templateRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    pool: process.env.VITEST_POOL === "threads" ? "threads" : "forks",
    threads: false,
    watch: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        statements: 58.5,
        branches: 46.8,
        functions: 49.5,
        lines: 59.9,
      },
    },
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
      "server/**/*.test.ts",
      "server/**/*.test.tsx",
      "server/**/*.spec.ts",
      "server/**/*.spec.tsx",
    ],
  },
});
