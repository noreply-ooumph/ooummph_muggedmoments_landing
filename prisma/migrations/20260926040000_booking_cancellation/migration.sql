-- Stage 19, Phase 19.5 — booking cancellation. Purely additive.
CREATE TYPE "CancelledByActor" AS ENUM ('CUSTOMER', 'VENDOR');

ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "bookings" ADD COLUMN "cancelled_by" "CancelledByActor";
