import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure functions only — no jsdom needed. Tests deliberately avoid importing
    // anything that pulls in @kip/db (which instantiates Sequelize at load).
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
