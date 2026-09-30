-- Stage 16, Phase 1 — additive vendor-editable profile fields.
-- All nullable/defaulted so existing vendor rows remain valid without backfill.
ALTER TABLE "vendors"
  ADD COLUMN "about" TEXT,
  ADD COLUMN "starting_price" INTEGER,
  ADD COLUMN "service_areas" TEXT[] NOT NULL DEFAULT '{}';
