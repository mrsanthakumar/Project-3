import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Satisfy fail-fast env validation in lib/env.ts at import time.
    // Unit tests exercise pure logic and never open a real DB connection.
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      JWT_SECRET: "test-secret-not-used-for-real-signing-0123456789",
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
});
