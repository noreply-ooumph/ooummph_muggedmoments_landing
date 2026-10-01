/**
 * MuggedMoments — /vendor/dashboard/opportunities (Stage 18, Phase 18.0)
 *
 * Session-gated server component, same convention as /vendor/dashboard. Lists the
 * vendor's opportunities as clean requirement cards — no customer name/phone.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { formatEventTypeDisplay } from "@/config/event-types";
import { getVendorSession } from "@/lib/vendorSession";
import { isExpired } from "@/domain/opportunity/opportunityService";
import prisma from "@/lib/db/prisma";
import { OpportunityListClient } from "./OpportunityListClient";

export default async function VendorOpportunitiesPage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
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

  const items = opportunities.map((opp) => ({
    id: opp.id,
    status: opp.status,
    expired: isExpired(opp, now),
    eventTypeName: formatEventTypeDisplay(opp.lead.eventType.name, opp.lead.customEventTypeName),
    city: opp.lead.city,
    services: opp.lead.services,
  }));

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Opportunities</h1>
        <Link href="/vendor/dashboard" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          Back
        </Link>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        You get an opportunity when a customer submits a matching request while
        you&apos;re registered, plus a one-time check of still-open requests from
        before you joined — you won&apos;t see requests that were already closed
        or expired by the time you registered.
      </p>

      <OpportunityListClient opportunities={items} />
    </div>
  );
}
