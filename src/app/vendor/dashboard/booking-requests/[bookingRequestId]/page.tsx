/**
 * MuggedMoments — /vendor/dashboard/booking-requests/[bookingRequestId]
 * (Stage 19, Phase 19.1)
 *
 * Session-gated + ownership-checked (404 via notFound()), same pattern as
 * /vendor/dashboard/opportunities/[opportunityId]. Actions render only while the
 * request is REQUESTED and not expired — mirrors canRespond on the opportunity
 * detail page.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatEventTypeDisplay } from "@/config/event-types";
import { getVendorSession } from "@/lib/vendorSession";
import { isBookingRequestExpired } from "@/domain/booking/bookingRequestService";
import { calculateTotal } from "@/domain/quote/quoteService";
import { toPublicBookingTimelineEntry } from "@/domain/booking/bookingTimelineService";
import { BookingTimeline } from "@/components/booking/BookingTimeline";
import prisma from "@/lib/db/prisma";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { BookingRequestActions } from "./BookingRequestActions";
import { CancelBookingAction } from "./CancelBookingAction";

// Label text unchanged from before (this page's own longer, descriptive copy — kept
// as-is, not replaced with BookingRequestListClient's shorter list-view labels).
// Tones match BookingRequestListClient.tsx's STATUS_BADGE exactly for these 5 keys.
const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  REQUESTED: { label: "New request — awaiting your response", tone: "amber" },
  UNDER_REVIEW: { label: "Under review", tone: "zinc" },
  ACCEPTED: { label: "You accepted this booking", tone: "emerald" },
  REJECTED: { label: "You rejected this booking", tone: "red" },
  EXPIRED: { label: "This request expired", tone: "gray" },
};

export default async function VendorBookingRequestDetailPage({
  params,
}: {
  params: Promise<{ bookingRequestId: string }>;
}) {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
  }

  const { bookingRequestId } = await params;

  const bookingRequest = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: {
      opportunity: {
        include: { lead: { include: { eventType: { select: { name: true } } } } },
      },
      quoteVersion: { include: { lineItems: true } },
      // Stage 19, Phase 19.4 — booking timeline UI.
      booking: { include: { statusHistory: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!bookingRequest || bookingRequest.opportunity.vendorId !== session.vendorId) {
    notFound();
  }

  const now = new Date();
  const expired = isBookingRequestExpired(bookingRequest, now);
  const canRespond = bookingRequest.status === "REQUESTED" && !expired;
  const lead = bookingRequest.opportunity.lead;
  const total = calculateTotal(bookingRequest.quoteVersion.lineItems);

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Booking Request</h1>
        <Link href="/vendor/dashboard/booking-requests" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          Back
        </Link>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-lg font-medium text-zinc-100">
          {formatEventTypeDisplay(lead.eventType.name, lead.customEventTypeName)}
        </p>
        <p className="text-sm text-zinc-400">📍 {lead.city}</p>
        {lead.eventDate && (
          <p className="text-sm text-zinc-400">📅 {lead.eventDate.toLocaleDateString()}</p>
        )}
        {lead.guestCount && <p className="text-sm text-zinc-400">👥 {lead.guestCount} guests</p>}
        <p className="text-sm text-zinc-400">
          Quote total: <span className="font-mono text-zinc-200">₹{total.toLocaleString("en-IN")}</span>
        </p>
        {bookingRequest.status === "REQUESTED" && (
          <p className="text-sm text-zinc-400">
            Respond by: <span className="text-zinc-200">{bookingRequest.responseDeadline.toLocaleString()}</span>
          </p>
        )}
      </div>

      {expired && bookingRequest.status === "REQUESTED" && (
        <p className="text-sm text-zinc-500 mb-3">This request has expired.</p>
      )}

      {canRespond && <BookingRequestActions bookingRequestId={bookingRequest.id} />}

      {!canRespond && (
        <div>
          {bookingRequest.booking?.status === "CANCELLED" ? (
            // No precedent for this exact case in any existing tone map — new call,
            // per the brief: "gray" (neutral/negative, matching EXPIRED's tone).
            <StatusBadge label="This booking was cancelled" tone="gray" />
          ) : (
            <StatusBadge
              label={STATUS_LABEL[bookingRequest.status]?.label ?? bookingRequest.status}
              tone={STATUS_LABEL[bookingRequest.status]?.tone ?? "zinc"}
            />
          )}
        </div>
      )}

      {bookingRequest.status === "REJECTED" && bookingRequest.rejectionReason && (
        <p className="text-xs text-zinc-500 mt-1">{bookingRequest.rejectionReason}</p>
      )}

      {bookingRequest.status === "ACCEPTED" && bookingRequest.booking?.status === "CONFIRMED" && (
        <CancelBookingAction bookingRequestId={bookingRequest.id} />
      )}

      {bookingRequest.booking && (
        <>
          <p className="text-xs text-zinc-500 font-mono mt-3">
            Booking ID: {bookingRequest.booking.publicBookingId}
          </p>
          <BookingTimeline
            entries={bookingRequest.booking.statusHistory.map(toPublicBookingTimelineEntry)}
          />
        </>
      )}
    </div>
  );
}
