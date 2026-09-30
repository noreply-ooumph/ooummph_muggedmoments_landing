/**
 * MuggedMoments — GET /api/vendors/[vendorId] (Stage 16, Phase 3)
 *
 * Public, unauthenticated, customer-facing endpoint — no session check, by design.
 * Only active vendors are visible; inactive or nonexistent vendors both return a
 * plain 404 (no distinction leaked between "never existed" and "deactivated").
 */

import { NextRequest, NextResponse } from "next/server";
import { toPublicVendorProfile } from "@/domain/vendorProfile/publicVendorProfileService";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
): Promise<NextResponse> {
  const { vendorId } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      services: { include: { service: true } },
      portfolioItems: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!vendor || !vendor.active) {
    return NextResponse.json(
      { error: { code: "VENDOR_NOT_FOUND", message: "Vendor not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json(toPublicVendorProfile(vendor), { status: 200 });
}
