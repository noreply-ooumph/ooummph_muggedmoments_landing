import { defineConfig } from "@playwright/test";

/**
 * MuggedMoments — Playwright e2e config (Stage 19, Phase 19.7.7)
 *
 * First slice of this repo's e2e suite — see tests/e2e/bookingJourney.spec.ts
 * for exactly what "the complete journey" is scoped to here (the Stage 19
 * booking flow, not the whole Stage 1-18 intake funnel, which is a separate,
 * already-existing feature set outside Stage 19's scope).
 *
 * webServer starts a real `next dev` on a dedicated port for the test run and
 * tears it down afterward — the standard Playwright pattern, used instead of
 * spawning/killing the server manually as tests/integration/** does, since
 * Playwright already solves this correctly and cross-platform.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3056",
  },
  webServer: {
    command: "npx next dev -p 3056",
    url: "http://localhost:3056",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
