import { defineConfig } from "vitest/config";
import path from "path";

/**
 * MuggedMoments — Integration test config (Stage 19, Phase 19.7.7)
 *
 * Separate from vitest.config.ts (which stays fast/pure, tests/unit/** only).
 * These tests hit the real local Postgres dev database directly via Prisma
 * and drive a real `next dev` server over HTTP — the same manual technique
 * used throughout this project's phase-by-phase testing (spawn a dev server,
 * curl/fetch it, verify DB state, tear down), now automated and repeatable.
 * Longer timeouts because each test starts a real dev server and hits a real
 * database, not because the assertions themselves are slow.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Integration tests share one real dev server per file (started in
    // beforeAll) — running files in parallel would each try to bind their own
    // port and hit the same live DB concurrently, which is unnecessary risk
    // for a first slice of this suite.
    fileParallelism: false,
    alias: {
      "@/": path.resolve(__dirname, "./src") + "/",
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
