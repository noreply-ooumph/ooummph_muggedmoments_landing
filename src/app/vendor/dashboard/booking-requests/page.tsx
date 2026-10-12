/**
 * MuggedMoments — /vendor/dashboard/booking-requests (Stage 19, Phase 19.1)
 *
 * Session-gated server component, same convention as /vendor/dashboard/opportunities.
 * Lists the vendor's booking requests as cards linking to the detail page.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { formatEventTypeDisplay } from "@/config/event-types";
import { getVendorSession } from "@/lib/vendorSession";
import { isBookingRequestExpired } from "@/domain/booking/bookingRequestService";
import { calculateTotal } from "@/domain/quote/quoteService";
import prisma from "@/lib/db/prisma";
import { BookingRequestListClient } from "./BookingRequestListClient";

export default async function VendorBookingRequestsPage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/join-as-vendor");
  }

  const bookingRequests = await prisma.bookingRequest.findMany({
    where: { opportunity: { vendorId: session.vendorId } },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: {
        include: { lead: { include: { eventType: { select: { name: true } } } } },
      },
      quoteVersion: { include: { lineItems: true } },
    },
  });

  const now = new Date();

  const items = bookingRequests.map((br) => ({
    id: br.id,
    status: br.status,
    expired: isBookingRequestExpired(br, now),
    eventTypeName: formatEventTypeDisplay(
      br.opportunity.lead.eventType.name,
      br.opportunity.lead.customEventTypeName
    ),
    city: br.opportunity.lead.city,
    total: calculateTotal(br.quoteVersion.lineItems),
  }));

  return (
    <div className="w-full space-y-6">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Booking Requests</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Customer quote acceptances and direct booking requests awaiting your review
            </p>
          </div>
          <Link
            href="/vendor/dashboard"
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-lg transition-colors border border-zinc-700/60"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <BookingRequestListClient bookingRequests={items} />
      </div>
    </div>
  );
}
