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
    // Injects test-only env vars (e.g. PII_ENCRYPTION_KEY) before any test module is imported.
    // See src/test/setup-env.ts — contains ONLY fake, non-secret test values.
    setupFiles: ["./src/test/setup-env.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        // Recalibrated after removing legacy dashboard/page.tsx (dead code).
        // Actual CI values: statements=55.98%, branches=43.98%, functions=45.62%, lines=57.59%.
        // Floor set 0.5pp below actuals to prevent gate from blocking on dead code removal.
        statements: 55.5,
        branches: 43.5,
        functions: 45.0,
        lines: 57.0,
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
