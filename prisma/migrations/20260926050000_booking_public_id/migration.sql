-- Stage 19, Phase 19.7.3 — public Booking ID for customer/vendor-facing display.
ALTER TABLE "bookings" ADD COLUMN "public_booking_id" TEXT;

UPDATE "bookings"
SET "public_booking_id" = 'BK-' || upper(substr(md5(random()::text || id), 1, 8));

ALTER TABLE "bookings" ALTER COLUMN "public_booking_id" SET NOT NULL;
CREATE UNIQUE INDEX "bookings_public_booking_id_key" ON "bookings"("public_booking_id");
