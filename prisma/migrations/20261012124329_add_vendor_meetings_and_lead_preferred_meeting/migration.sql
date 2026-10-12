-- Written idempotently (IF NOT EXISTS / exception-guarded) rather than as a
-- plain CREATE, because this closes a gap where the VendorMeeting model was
-- committed to schema.prisma previously but never shipped through a real
-- migration -- production's actual table state was unknown at the time this
-- was written, so this must apply cleanly whether vendor_meetings already
-- exists there (from a prior manual `db push`) or not.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "preferred_meeting_date" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "preferred_meeting_time" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_meetings" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "time_slot" TEXT NOT NULL,
    "notes" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_meetings_public_id_key" ON "vendor_meetings"("public_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_meetings_vendor_id_idx" ON "vendor_meetings"("vendor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_meetings_customer_phone_idx" ON "vendor_meetings"("customer_phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_meetings_meeting_date_idx" ON "vendor_meetings"("meeting_date");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "vendor_meetings" ADD CONSTRAINT "vendor_meetings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
