-- Stage 18, Phase 18.4 — quote versioning. Restructures the existing 1:1 Quote
-- table into Quote (parent) -> QuoteVersion (versioned snapshot) -> QuoteLineItem,
-- preserving every existing row as "version 1" of its quote.

-- 1. New table for versioned quote data.
CREATE TABLE "quote_versions" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "availability_state" "QuoteAvailabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "included" TEXT[] NOT NULL DEFAULT '{}',
    "excluded" TEXT[] NOT NULL DEFAULT '{}',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quote_versions_quote_id_version_number_key" ON "quote_versions"("quote_id", "version_number");
CREATE INDEX "quote_versions_quote_id_idx" ON "quote_versions"("quote_id");

ALTER TABLE "quote_versions"
  ADD CONSTRAINT "quote_versions_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Migrate every existing quotes row into quote_versions as version 1 —
--    one-to-one, no data transformation, just relocation.
INSERT INTO "quote_versions"
  ("id", "quote_id", "version_number", "status", "availability_state", "valid_until",
   "notes", "included", "excluded", "submitted_at", "created_at", "updated_at")
SELECT
  gen_random_uuid(), "id", 1, "status", "availability_state", "valid_until",
  "notes", "included", "excluded", "submitted_at", "created_at", "updated_at"
FROM "quotes";

-- 3. Point existing line items at their new quote_version row instead of the
--    old quotes row directly.
ALTER TABLE "quote_line_items" ADD COLUMN "quote_version_id" TEXT;

UPDATE "quote_line_items" li
SET "quote_version_id" = qv."id"
FROM "quote_versions" qv
WHERE qv."quote_id" = li."quote_id";

-- Sanity gate: abort the migration if any line item failed to map (would mean a
-- quote_line_items row pointed at a quotes row that had no corresponding insert
-- above — should be impossible given step 2 covers every quotes row, but this
-- is exactly the kind of check a data-restructuring migration must not skip).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "quote_line_items" WHERE "quote_version_id" IS NULL) THEN
    RAISE EXCEPTION 'quote_line_items row(s) failed to map to a quote_version — aborting migration';
  END IF;
END $$;

ALTER TABLE "quote_line_items" ALTER COLUMN "quote_version_id" SET NOT NULL;

ALTER TABLE "quote_line_items" DROP CONSTRAINT "quote_line_items_quote_id_fkey";
CREATE INDEX "quote_line_items_quote_version_id_idx" ON "quote_line_items"("quote_version_id");
ALTER TABLE "quote_line_items"
  ADD CONSTRAINT "quote_line_items_quote_version_id_fkey"
  FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "quote_line_items_quote_id_idx";
ALTER TABLE "quote_line_items" DROP COLUMN "quote_id";

-- 4. Now that every field has a home in quote_versions, drop the moved columns
--    from quotes — it becomes the thin parent row it's meant to be.
ALTER TABLE "quotes"
  DROP COLUMN "status",
  DROP COLUMN "availability_state",
  DROP COLUMN "valid_until",
  DROP COLUMN "notes",
  DROP COLUMN "included",
  DROP COLUMN "excluded",
  DROP COLUMN "submitted_at";
