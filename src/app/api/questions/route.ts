/**
 * MuggedMoments — GET /api/questions?eventTypeSlug=wedding
 *
 * Returns the active dynamic Question catalog relevant to a given event type
 * (event-type-specific + global questions), for the client-side dynamic form step.
 *
 * This route is new/additive — required because ProgressiveForm.tsx is a "use client"
 * component and cannot call the Prisma-backed dynamicQuestionsService directly (bundling
 * Prisma into the browser is unsupported). Read-only, no PII, same validation posture as
 * the existing /api/leads routes (never trust input slug directly).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { findEventTypeBySlug } from "@/config/event-types";
import { getActiveQuestionsForEventType } from "@/domain/dynamicQuestions/dynamicQuestionsService";
import { toApiErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const eventTypeSlug = request.nextUrl.searchParams.get("eventTypeSlug");

  if (!eventTypeSlug || !findEventTypeBySlug(eventTypeSlug)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid eventTypeSlug.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const eventTypeRecord = await prisma.eventType.findUnique({
      where: { slug: eventTypeSlug },
    });

    if (!eventTypeRecord) {
      // Config and DB are out of sync — same posture as leadService's equivalent check
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    const questions = await getActiveQuestionsForEventType(eventTypeRecord.id);
    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    const { body, status } = toApiErrorResponse(error);
    logger.error("GET /api/questions failed", {
      operation: "GET /api/questions",
      eventTypeSlug,
    });
    return NextResponse.json(body, { status });
  }
}
