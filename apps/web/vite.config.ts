/// <reference types="vitest" />
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    watch: {
      ignored: ["**/*.db", "**/*.db-journal", "**/*.db-wal", "**/*.db-shm", "**/*.backup.*"],
    },
  },
  test: {
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    watch: false,
  },
});
