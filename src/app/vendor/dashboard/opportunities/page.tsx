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
    redirect("/join-as-vendor");
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
    <div className="w-full space-y-6">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lead Opportunities</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Matching lead requests from clients based on your service offerings and location
            </p>
          </div>
          <Link
            href="/vendor/dashboard"
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-lg transition-colors border border-zinc-700/60"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed mb-6 bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3.5">
          ℹ️ You get an opportunity when a customer submits a matching request while you&apos;re registered, plus a one-time check of still-open requests from before you joined — you won&apos;t see requests that were already closed or expired by the time you registered.
        </p>

        <OpportunityListClient opportunities={items} />
      </div>
    </div>
  );
}
