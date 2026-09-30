/**
 * MuggedMoments — PATCH & DELETE /api/internal/vendors/[vendorId]
 *
 * Admin panel. Covered by proxy.ts's Basic Auth gate; no separate auth check
 * here.
 *
 * PATCH accepts two distinct request shapes, dispatched on which keys are
 * present — a body with `status` runs the original v1 verification
 * decision (flips verificationStatus only, untouched from its original
 * behavior); any other recognized field runs a profile correction via
 * updateVendorDetailsForAdmin() (added later, same VendorProfilePatchSchema
 * the vendor's own PATCH /api/vendor/profile already uses — no separate
 * schema invented for the same field set). The two never run together in one
 * request; a body must be one shape or the other.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  setVendorVerificationStatus,
  updateVendorDetailsForAdmin,
  deleteVendorForAdmin,
} from "@/domain/vendorProfile/adminVendorService";
import {
  VendorVerificationPatchSchema,
  VendorProfilePatchSchema,
} from "@/lib/validation/schemas";
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

  const isVerificationDecision =
    !!body && typeof body === "object" && "status" in body;

  if (isVerificationDecision) {
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

  const parseResult = VendorProfilePatchSchema.safeParse(body);
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
    const updated = await updateVendorDetailsForAdmin(vendorId, parseResult.data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    logger.error("Failed to update vendor details (admin)", {
      operation: "PATCH /api/internal/vendors/:vendorId",
      vendorId,
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
): Promise<NextResponse> {
  const { vendorId } = await params;

  try {
    const result = await deleteVendorForAdmin(vendorId);
    return NextResponse.json({ success: true, name: result.name }, { status: 200 });
  } catch (error) {
    logger.error("Failed to delete vendor (admin)", {
      operation: "DELETE /api/internal/vendors/:vendorId",
      vendorId,
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
