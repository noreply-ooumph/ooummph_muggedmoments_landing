-- Stage 19, Phase 19.1 — confirmed bookings + audit trail. Purely additive.
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED');

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "booking_request_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookings_booking_request_id_key" ON "bookings"("booking_request_id");
CREATE INDEX "bookings_vendor_id_idx" ON "bookings"("vendor_id");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_booking_request_id_fkey"
  FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "booking_status_history_booking_id_idx" ON "booking_status_history"("booking_id");

ALTER TABLE "booking_status_history"
  ADD CONSTRAINT "booking_status_history_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
