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
    redirect("/vendor");
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
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Booking Requests</h1>
        <Link href="/vendor/dashboard" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          Back
        </Link>
      </div>

      <BookingRequestListClient bookingRequests={items} />
    </div>
  );
}
