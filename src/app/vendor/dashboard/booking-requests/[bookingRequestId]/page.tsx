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
    redirect("/join-as-vendor");
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
    <div className="w-full space-y-6">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {formatEventTypeDisplay(lead.eventType.name, lead.customEventTypeName)}
              </h1>
              {!canRespond && (
                <div>
                  {bookingRequest.booking?.status === "CANCELLED" ? (
                    <StatusBadge label="This booking was cancelled" tone="gray" />
                  ) : (
                    <StatusBadge
                      label={STATUS_LABEL[bookingRequest.status]?.label ?? bookingRequest.status}
                      tone={STATUS_LABEL[bookingRequest.status]?.tone ?? "zinc"}
                    />
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Client quote booking request & response control
            </p>
          </div>
          <Link
            href="/vendor/dashboard/booking-requests"
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors border border-zinc-700/60 shrink-0"
          >
            ← Back to Booking Requests
          </Link>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Location</span>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span>📍</span> {lead.city}
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Event Date</span>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span>📅</span> {lead.eventDate ? lead.eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Flexible / TBD"}
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Guest Count</span>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span>👥</span> {lead.guestCount ? `${lead.guestCount} guests` : "Not specified"}
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Accepted Quote Total</span>
            <p className="text-sm font-bold text-amber-400 font-mono mt-1 flex items-center gap-1.5">
              <span>💰</span> ₹{total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {bookingRequest.status === "REQUESTED" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 flex items-center justify-between">
            <span>⏰ Respond By Deadline:</span>
            <span className="font-bold text-white font-mono">{bookingRequest.responseDeadline.toLocaleString()}</span>
          </div>
        )}

        {expired && bookingRequest.status === "REQUESTED" && (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400">
            ⏳ This request has expired.
          </div>
        )}

        {canRespond && (
          <div className="pt-2 border-t border-zinc-800">
            <BookingRequestActions bookingRequestId={bookingRequest.id} />
          </div>
        )}

        {bookingRequest.status === "REJECTED" && bookingRequest.rejectionReason && (
          <p className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-900">{bookingRequest.rejectionReason}</p>
        )}

        {bookingRequest.status === "ACCEPTED" && bookingRequest.booking?.status === "CONFIRMED" && (
          <div className="pt-2 border-t border-zinc-800">
            <CancelBookingAction bookingRequestId={bookingRequest.id} />
          </div>
        )}

        {bookingRequest.booking && (
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-white">Confirmed Booking Progress</span>
              <span className="font-mono text-zinc-500">Ref: {bookingRequest.booking.publicBookingId}</span>
            </div>
            <BookingTimeline
              entries={bookingRequest.booking.statusHistory.map(toPublicBookingTimelineEntry)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
