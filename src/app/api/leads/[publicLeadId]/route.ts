/**
 * MuggedMoments — GET /api/leads/[publicLeadId]
 *
 * Returns customer-safe lead status by public ID.
 * Does NOT expose internal IDs, sensitive matching data,
 * or operational details not appropriate for the customer context.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLeadByPublicId, resumeLead } from "@/services/lead/leadService";
import { toApiErrorResponse } from "@/lib/errors";
import { PublicLeadIdSchema, LeadPatchSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicLeadId: string }> }
): Promise<NextResponse> {
  const { publicLeadId } = await params;

  // Validate format
  const parseResult = PublicLeadIdSchema.safeParse(publicLeadId);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid lead ID format.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const lead = await getLeadByPublicId(publicLeadId);

    if (!lead) {
      return NextResponse.json(
        {
          error: {
            code: "LEAD_NOT_FOUND",
            message: "Lead not found.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(lead, { status: 200 });
  } catch (error) {
    const { body, status } = toApiErrorResponse(error);
    logger.error("GET /api/leads/:id failed", {
      operation: "GET /api/leads/:id",
      publicLeadId,
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * MuggedMoments — PATCH /api/leads/[publicLeadId]
 *
 * Stage 9 "Continue" flow — resumes an INCOMPLETE lead by supplying its currently
 * missing fields. Only fields listed in that lead's missingFields may be set; see
 * resumeLead()'s doc comment for the full trust-model rationale.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ publicLeadId: string }> }
): Promise<NextResponse> {
  const { publicLeadId } = await params;

  const idParseResult = PublicLeadIdSchema.safeParse(publicLeadId);
  if (!idParseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid lead ID format.",
        },
      },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
        },
      },
      { status: 400 }
    );
  }

  const parseResult = LeadPatchSchema.safeParse(body);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path.join(".");
      if (field && !fields[field]) {
        fields[field] = issue.message;
      }
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
    const result = await resumeLead(publicLeadId, parseResult.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { body: errBody, status } = toApiErrorResponse(error);
    logger.error("PATCH /api/leads/:id failed", {
      operation: "PATCH /api/leads/:id",
      publicLeadId,
    });
    return NextResponse.json(errBody, { status });
  }
}
