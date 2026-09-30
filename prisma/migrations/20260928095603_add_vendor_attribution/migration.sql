-- AlterTable
ALTER TABLE "quote_versions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vendors" ALTER COLUMN "service_areas" DROP DEFAULT;

-- CreateTable
CREATE TABLE "vendor_attributions" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "landing_path" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_attributions_vendor_id_key" ON "vendor_attributions"("vendor_id");

-- AddForeignKey
ALTER TABLE "vendor_attributions" ADD CONSTRAINT "vendor_attributions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
