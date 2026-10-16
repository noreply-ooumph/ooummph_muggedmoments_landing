/**
 * MuggedMoments — POST /api/leads/by-phone
 *
 * Customer-facing "check my status" lookup (Stage 20).
 * Supports lookup by normalized phone number or MM- reference code (BUG-002).
 *
 * Returns { leads: LeadSummary[] } — an empty array (not an error) when a phone
 * number or reference code has zero requests; that's valid input, not a failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLeadSummariesByPhone, getLeadByPublicId } from "@/services/lead/leadService";
import { toApiErrorResponse } from "@/lib/errors";
import { LeadPhoneLookupSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  // BUG-002: Check if client provided an MM- tracking reference code
  const candidate =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).reference ||
        (body as Record<string, unknown>).referenceCode ||
        (body as Record<string, unknown>).phone
      : null;

  if (typeof candidate === "string" && /^MM-[A-Za-z0-9]{8}$/i.test(candidate.trim())) {
    try {
      const publicLeadId = candidate.trim().toUpperCase();
      const lead = await getLeadByPublicId(publicLeadId);

      if (!lead) {
        return NextResponse.json({ leads: [] }, { status: 200 });
      }

      return NextResponse.json(
        {
          leads: [
            {
              publicLeadId: lead.publicLeadId,
              eventType: lead.eventType,
              city: lead.city,
              eventDate: lead.eventDate ?? null,
              status: lead.status,
              createdAt: lead.createdAt,
              matchCount: lead.matches?.length ?? 0,
              quoteCount: lead.quotes?.length ?? 0,
            },
          ],
        },
        { status: 200 }
      );
    } catch (error) {
      const { body: errBody, status } = toApiErrorResponse(error);
      logger.error("POST /api/leads/by-phone (reference lookup) failed", {
        operation: "POST /api/leads/by-phone",
      });
      return NextResponse.json(errBody, { status });
    }
  }

  const parseResult = LeadPhoneLookupSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please enter a valid phone number or MM- reference code.",
        },
      },
      { status: 422 }
    );
  }

  try {
    const leads = await getLeadSummariesByPhone(parseResult.data.phone);
    return NextResponse.json({ leads }, { status: 200 });
  } catch (error) {
    const { body: errBody, status } = toApiErrorResponse(error);
    logger.error("POST /api/leads/by-phone failed", {
      operation: "POST /api/leads/by-phone",
    });
    return NextResponse.json(errBody, { status });
  }
}
