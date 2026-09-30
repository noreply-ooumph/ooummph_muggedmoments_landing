-- Stage 18, Phase 18.0 — vendor opportunities (dispatch of eligible matches to vendors).
CREATE TYPE "VendorOpportunityStatus" AS ENUM ('CREATED', 'SENT', 'VIEWED', 'INTERESTED', 'DECLINED');

CREATE TABLE "vendor_opportunities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "status" "VendorOpportunityStatus" NOT NULL DEFAULT 'CREATED',
    "response_deadline" TIMESTAMP(3) NOT NULL,
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_opportunities_lead_id_vendor_id_key" ON "vendor_opportunities"("lead_id", "vendor_id");
CREATE INDEX "vendor_opportunities_vendor_id_idx" ON "vendor_opportunities"("vendor_id");
CREATE INDEX "vendor_opportunities_lead_id_idx" ON "vendor_opportunities"("lead_id");

ALTER TABLE "vendor_opportunities"
  ADD CONSTRAINT "vendor_opportunities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_opportunities"
  ADD CONSTRAINT "vendor_opportunities_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
