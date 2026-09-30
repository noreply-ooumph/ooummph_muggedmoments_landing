-- Stage 18, Phase 18.1 — structured quote builder.
ALTER TYPE "VendorOpportunityStatus" ADD VALUE 'QUOTE_PENDING';
ALTER TYPE "VendorOpportunityStatus" ADD VALUE 'QUOTE_SUBMITTED';

CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "QuoteAvailabilityState" AS ENUM ('AVAILABLE', 'PENDING_CONFIRMATION', 'UNAVAILABLE', 'UNKNOWN');

CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "availability_state" "QuoteAvailabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "included" TEXT[] NOT NULL DEFAULT '{}',
    "excluded" TEXT[] NOT NULL DEFAULT '{}',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quotes_opportunity_id_key" ON "quotes"("opportunity_id");

CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quote_line_items_quote_id_idx" ON "quote_line_items"("quote_id");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "vendor_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_line_items"
  ADD CONSTRAINT "quote_line_items_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
