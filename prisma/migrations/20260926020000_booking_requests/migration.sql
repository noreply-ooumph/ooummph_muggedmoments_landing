-- Stage 19, Phase 19.0 — booking request creation. Purely additive.
CREATE TYPE "BookingRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TABLE "booking_requests" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "quote_version_id" TEXT NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "response_deadline" TIMESTAMP(3) NOT NULL,
    "rejection_reason" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "booking_requests_idempotency_key_key" ON "booking_requests"("idempotency_key");
CREATE INDEX "booking_requests_opportunity_id_idx" ON "booking_requests"("opportunity_id");
CREATE INDEX "booking_requests_quote_version_id_idx" ON "booking_requests"("quote_version_id");

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "vendor_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_quote_version_id_fkey"
  FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
