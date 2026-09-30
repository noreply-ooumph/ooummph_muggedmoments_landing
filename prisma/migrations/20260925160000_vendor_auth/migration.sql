-- CreateEnum
CREATE TYPE "VendorVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "verification_status" "VendorVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "vendor_otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_sessions" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_otp_codes_phone_idx" ON "vendor_otp_codes"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_sessions_token_hash_key" ON "vendor_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "vendor_sessions_vendor_id_idx" ON "vendor_sessions"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_contact_phone_key" ON "vendors"("contact_phone");

-- AddForeignKey
ALTER TABLE "vendor_sessions" ADD CONSTRAINT "vendor_sessions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

