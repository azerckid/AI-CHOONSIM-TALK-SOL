/// <reference types="vitest" />
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  define: {
    // Privy embedded wallet uses Node.js Buffer — polyfill for browser
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  resolve: {
    alias: {
      buffer: "buffer/",
    },
  },
  build: {
    manifest: true,
  },
  server: {
    watch: {
      ignored: ["**/*.db", "**/*.db-journal", "**/*.db-wal", "**/*.db-shm", "**/*.backup.*"],
    },
  },
  test: {
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/heartbeat.test.ts",
      "**/isolation.test.ts",
      "**/memory.test.ts",
    ],
    globals: true,
    watch: false,
  },
});
