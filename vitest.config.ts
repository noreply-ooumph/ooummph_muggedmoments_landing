import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Stage 19, Phase 19.7.7 — explicit now that tests/integration/** exists
    // alongside tests/unit/**: `npm test` must stay fast and pure (no DB, no
    // dev server), so it only ever picks up tests/unit/**. Integration tests
    // run separately via `npm run test:integration`
    // (vitest.integration.config.ts).
    include: ["tests/unit/**/*.test.ts"],
    alias: {
      "@/": path.resolve(__dirname, "./src") + "/",
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
