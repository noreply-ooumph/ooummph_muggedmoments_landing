/**
 * MuggedMoments — PATCH /api/internal/vendors/[vendorId]
 *
 * Admin panel MVP — approve or reject a pending vendor. Covered by
 * middleware.ts's Basic Auth gate; no separate auth check here.
 *
 * v1 scope only: flips verificationStatus, nothing else. No rejection
 * reason, no notification to the vendor.
 */

import { NextRequest, NextResponse } from "next/server";
import { setVendorVerificationStatus } from "@/domain/vendorProfile/adminVendorService";
import { VendorVerificationPatchSchema } from "@/lib/validation/schemas";
import { toApiErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
): Promise<NextResponse> {
  const { vendorId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = VendorVerificationPatchSchema.safeParse(body);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path.join(".");
      if (field && !fields[field]) fields[field] = issue.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields.",
          fields,
        },
      },
      { status: 422 }
    );
  }

  try {
    const vendor = await setVendorVerificationStatus(
      vendorId,
      parseResult.data.status
    );
    return NextResponse.json(
      { id: vendor.id, verificationStatus: vendor.verificationStatus },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to update vendor verification status", {
      operation: "PATCH /api/internal/vendors/:vendorId",
      vendorId,
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
