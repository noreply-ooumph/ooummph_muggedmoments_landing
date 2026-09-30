/**
 * MuggedMoments — PATCH /api/internal/leads/[publicLeadId]
 *
 * Admin-only lead correction. Covered by proxy.ts's Basic Auth gate
 * (/api/internal/:path*); no separate auth check here — same convention as
 * PATCH /api/internal/vendors/[vendorId].
 *
 * See updateLeadDetailsForAdmin() in leadService.ts for the full trust-model
 * reasoning (deliberately broader than the customer-facing PATCH
 * /api/leads/[publicLeadId], and for different reasons per field).
 */

import { NextRequest, NextResponse } from "next/server";
import { updateLeadDetailsForAdmin } from "@/services/lead/leadService";
import { AdminLeadPatchSchema } from "@/lib/validation/schemas";
import { toApiErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ publicLeadId: string }> }
): Promise<NextResponse> {
  const { publicLeadId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = AdminLeadPatchSchema.safeParse(body);
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
    const updated = await updateLeadDetailsForAdmin(publicLeadId, parseResult.data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    logger.error("Failed to update lead details (admin)", {
      operation: "PATCH /api/internal/leads/:publicLeadId",
      publicLeadId,
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
