/**
 * MuggedMoments — GET /api/vendor/opportunities/[opportunityId] (Stage 18, Phase 18.0)
 *
 * Session-gated, ownership-checked (404, not 403, for a mismatched vendor — same
 * "honest but not leaky" rule as the portfolio-item routes). Marks SENT -> VIEWED
 * exactly once, idempotently, on first open.
 */

import { NextRequest, NextResponse } from "next/server";
import { formatEventTypeDisplay } from "@/config/event-types";
import { getVendorSession } from "@/lib/vendorSession";
import { nextStatus, isExpired } from "@/domain/opportunity/opportunityService";
import { createAuditLog } from "@/domain/audit/auditService";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ opportunityId: string }> }
): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const { opportunityId } = await params;

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      lead: {
        include: { eventType: { select: { name: true } } },
      },
    },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  let finalOpportunity = opportunity;

  if (opportunity.status === "SENT") {
    const now = new Date();
    const viewedStatus = nextStatus("SENT", "VIEW");
    if (viewedStatus) {
      finalOpportunity = await prisma.vendorOpportunity.update({
        where: { id: opportunity.id },
        data: { status: viewedStatus, viewedAt: now },
        include: {
          lead: {
            include: { eventType: { select: { name: true } } },
          },
        },
      });

      await createAuditLog({
        entityType: "VendorOpportunity",
        entityId: opportunity.id,
        action: "VENDOR_OPPORTUNITY_VIEWED",
      });
    }
  }

  const now = new Date();

  return NextResponse.json(
    {
      id: finalOpportunity.id,
      status: finalOpportunity.status,
      isExpired: isExpired(finalOpportunity, now),
      createdAt: finalOpportunity.createdAt,
      responseDeadline: finalOpportunity.responseDeadline,
      requirement: {
        eventType: formatEventTypeDisplay(
          finalOpportunity.lead.eventType.name,
          finalOpportunity.lead.customEventTypeName
        ),
        city: finalOpportunity.lead.city,
        eventDate: finalOpportunity.lead.eventDate,
        guestCount: finalOpportunity.lead.guestCount,
        services: finalOpportunity.lead.services,
        budget: finalOpportunity.lead.budget,
      },
    },
    { status: 200 }
  );
}
