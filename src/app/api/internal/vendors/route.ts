/**
 * MuggedMoments — GET /api/internal/vendors
 *
 * Admin panel MVP. Covered by middleware.ts's Basic Auth gate (config.matcher
 * includes /api/internal/:path*) — no separate auth check here by design, to
 * avoid two auth mechanisms drifting out of sync.
 */

import { NextResponse } from "next/server";
import { listVendorsForAdmin } from "@/domain/vendorProfile/adminVendorService";
import { toApiErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse> {
  try {
    const vendors = await listVendorsForAdmin();
    return NextResponse.json({ vendors }, { status: 200 });
  } catch (error) {
    logger.error("Failed to list vendors for admin", {
      operation: "GET /api/internal/vendors",
    });
    const { body, status } = toApiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
