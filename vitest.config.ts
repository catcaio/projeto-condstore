import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

if (process.platform === "win32" && !process.env.ESBUILD_BINARY_PATH) {
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

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
    ],
  },
});
