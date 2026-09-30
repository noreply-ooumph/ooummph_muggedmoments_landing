/**
 * MuggedMoments — GET /api/internal/leads/[publicLeadId]/timeline
 *
 * Read-only JSON lead timeline (Stage 14), merging AuditLog + AnalyticsEvent history.
 * No auth is added here — same posture note as /api/internal/funnel.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { PublicLeadIdSchema } from "@/lib/validation/schemas";
import { getLeadTimeline } from "@/domain/analytics/funnelService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicLeadId: string }> }
): Promise<NextResponse> {
  const { publicLeadId } = await params;

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

  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json(
      { error: { code: "LEAD_NOT_FOUND", message: "Lead not found." } },
      { status: 404 }
    );
  }

  const timeline = await getLeadTimeline(lead.id);
  return NextResponse.json({ publicLeadId, timeline });
}
