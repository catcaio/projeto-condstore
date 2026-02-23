const { defineConfig } = require("vitest/config");
const path = require("node:path");
const fs = require("node:fs");

const isWindows = process.platform === "win32";

if (isWindows && !process.env.ESBUILD_BINARY_PATH) {
  const esbuildPath = path.resolve(
    "node_modules",
    "vite",
    "node_modules",
    "@esbuild",
    "win32-x64",
    "esbuild.exe"
  );

  if (fs.existsSync(esbuildPath)) {
    process.env.ESBUILD_BINARY_PATH = esbuildPath;
  }
}

const templateRoot = path.resolve(__dirname);

module.exports = defineConfig({
  root: templateRoot,
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    ...(isWindows
      ? {
          pool: "threads",
          maxThreads: 1,
          minThreads: 1,
          fileParallelism: false,
          sequence: { concurrent: false },
        }
      : {}),
    include: [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
    ],
  },
});
