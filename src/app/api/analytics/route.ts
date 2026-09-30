/**
 * MuggedMoments — POST /api/analytics
 *
 * Persists a single analytics event (Stage 14). Previously events only reached
 * console.log via MockAnalyticsProvider — this is the first place they become
 * queryable. No PII scrubbing is added here beyond what AnalyticsPayload's existing
 * comment already mandates ("never include PII in analytics payloads") — this trusts
 * the existing client-side discipline, matching how the rest of this codebase already
 * trusts its own established conventions rather than adding a redundant server-side
 * filter that doesn't exist anywhere else in this codebase.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { AnalyticsEventBodySchema } from "@/lib/validation/schemas";
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

  const parseResult = AnalyticsEventBodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid analytics event." } },
      { status: 422 }
    );
  }

  const { event, properties, anonymousId, leadId, publicLeadId } = parseResult.data;

  try {
    let resolvedLeadId = leadId ?? null;

    // Resolve the customer-facing public ID to the internal Lead id — the client
    // never knows the internal id, matching how every other route in this codebase
    // resolves publicLeadId server-side (see the PATCH/GET lead routes).
    if (!resolvedLeadId && publicLeadId) {
      const lead = await prisma.lead.findUnique({
        where: { publicLeadId },
        select: { id: true },
      });
      resolvedLeadId = lead?.id ?? null;
    }

    await prisma.analyticsEvent.create({
      data: {
        event,
        properties: properties ?? {},
        anonymousId: anonymousId ?? null,
        leadId: resolvedLeadId,
      },
    });
  } catch {
    // Analytics failures must never break the customer-facing flow that triggered
    // them — log and return success anyway, matching auditService's own convention.
    logger.error("Failed to persist analytics event", {
      operation: "POST /api/analytics",
      event,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
