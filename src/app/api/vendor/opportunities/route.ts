/**
 * MuggedMoments — GET /api/vendor/opportunities (Stage 18, Phase 18.0)
 *
 * Session-gated. Lists the current vendor's opportunities only. Returns only the
 * clean requirement summary — event type, city, date, guest count, services,
 * budget — never the customer's name or phone (see plan §18.3: "the vendor should
 * not receive a giant CRM record").
 */

import { NextResponse } from "next/server";
import { formatEventTypeDisplay } from "@/config/event-types";
import { getVendorSession } from "@/lib/vendorSession";
import { isExpired } from "@/domain/opportunity/opportunityService";
import prisma from "@/lib/db/prisma";

export async function GET(): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const opportunities = await prisma.vendorOpportunity.findMany({
    where: { vendorId: session.vendorId },
    orderBy: { createdAt: "desc" },
    include: {
      lead: {
        include: { eventType: { select: { name: true } } },
      },
    },
  });

  const now = new Date();

  return NextResponse.json(
    {
      opportunities: opportunities.map((opp) => ({
        id: opp.id,
        status: opp.status,
        isExpired: isExpired(opp, now),
        createdAt: opp.createdAt,
        responseDeadline: opp.responseDeadline,
        requirement: {
          eventType: formatEventTypeDisplay(opp.lead.eventType.name, opp.lead.customEventTypeName),
          city: opp.lead.city,
          eventDate: opp.lead.eventDate,
          guestCount: opp.lead.guestCount,
          services: opp.lead.services,
          budget: opp.lead.budget,
        },
      })),
    },
    { status: 200 }
  );
}
