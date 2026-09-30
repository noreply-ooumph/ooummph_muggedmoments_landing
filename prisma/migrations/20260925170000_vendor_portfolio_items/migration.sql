-- Stage 16, Phase 2 — vendor portfolio items (uploaded images metadata).
CREATE TABLE "vendor_portfolio_items" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_portfolio_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vendor_portfolio_items_vendor_id_idx" ON "vendor_portfolio_items"("vendor_id");

ALTER TABLE "vendor_portfolio_items"
  ADD CONSTRAINT "vendor_portfolio_items_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
