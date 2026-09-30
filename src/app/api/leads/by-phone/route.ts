/**
 * MuggedMoments — POST /api/leads/by-phone
 *
 * Customer-facing "check my status" lookup (Stage 20) — phone-only, no
 * verification step. This is an explicit, informed product decision, not an
 * oversight: anyone who knows/guesses a customer's phone number can see every
 * event request tied to it. See docs/customer-status-lookup-brief.md for the
 * full tradeoff as presented to and confirmed by the operator.
 *
 * Phone travels in the request body, never a URL query param, so it doesn't sit
 * in server access logs or browser history.
 *
 * Returns { leads: LeadSummary[] } — an empty array (not an error) when a phone
 * number has zero requests; that's valid input, not a failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLeadSummariesByPhone } from "@/services/lead/leadService";
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

  const parseResult = LeadPhoneLookupSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please enter a valid phone number.",
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
