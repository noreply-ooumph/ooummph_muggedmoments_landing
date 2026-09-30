/**
 * MuggedMoments — /vendor/dashboard/edit (Stage 16, Phase 1)
 *
 * Server wrapper — session-gated exactly like /vendor/dashboard, then hands plain
 * serializable props to the client form component (same split as
 * src/app/status/[publicLeadId]/page.tsx -> StatusPageClient).
 */

import { redirect } from "next/navigation";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";
import { EditProfileClient } from "./EditProfileClient";

export default async function VendorEditProfilePage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    include: {
      portfolioItems: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      services: { select: { service: { select: { slug: true } } } },
    },
  });

  if (!vendor) {
    redirect("/vendor");
  }

  return (
    <EditProfileClient
      name={vendor.name}
      city={vendor.city}
      services={vendor.services.map((s) => s.service.slug)}
      about={vendor.about}
      startingPrice={vendor.startingPrice}
      serviceAreas={vendor.serviceAreas}
      profileComplete={vendor.profileComplete}
      portfolioItems={vendor.portfolioItems.map((item) => ({
        id: item.id,
        imagePath: item.imagePath,
      }))}
      documents={vendor.documents.map((doc) => ({
        id: doc.id,
        filePath: doc.filePath,
        originalFilename: doc.originalFilename,
      }))}
    />
  );
}
