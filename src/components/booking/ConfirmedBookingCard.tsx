/**
 * MuggedMoments — Confirmed Booking Card (Stage 19, Phase 19.2)
 *
 * Display-only — no client state or callbacks, unlike BookingRequestFlow.
 * Renders alongside (not replacing) the existing per-vendor BookingRequestFlow
 * "accepted" one-liner, as a prominent top-of-page summary once a booking is
 * confirmed.
 *
 * Stage 19, Phase 19.7.3 — richer confirmation moment: explicit Booking ID,
 * an honest "what happens next" (adapted from the plan's own example, since
 * this app never exposes vendor contact details to customers — the real
 * next step is messaging the vendor through the already-built MessageThread),
 * and a same-page scroll link to that thread. No "View Booking"/"Go to
 * Dashboard" buttons — neither has a distinct target in this single-page
 * architecture.
 */

import type { PublicBooking } from "@/domain/booking/publicBookingService";
import { BookingTimeline } from "@/components/booking/BookingTimeline";

export function ConfirmedBookingCard({ booking }: { booking: PublicBooking }) {
  return (
    <div className="rounded-xl p-4 border border-emerald-900/60 bg-emerald-950/30">
      <p className="text-lg font-semibold text-emerald-400">🎉 Booking Confirmed</p>
      <p className="text-xs text-zinc-500 font-mono mt-1">Booking ID: {booking.publicBookingId}</p>
      <p className="text-zinc-100 font-medium mt-2">{booking.vendorName}</p>
      <p className="text-sm text-zinc-300">
        📅 {new Date(booking.date).toLocaleDateString()}
      </p>
      <p className="text-sm text-zinc-300 font-mono">
        ₹{booking.quoteTotal.toLocaleString("en-IN")}
      </p>

      <div className="mt-3 space-y-1 text-xs text-zinc-400">
        <p className="text-zinc-500 uppercase tracking-wider">What happens next</p>
        <p>1. Booking confirmed</p>
        <p>2. Message your vendor here to coordinate details</p>
        <p>3. Event preparation</p>
      </div>

      <a
        href={`#vendor-${booking.vendorId}`}
        className="mt-3 inline-block text-sm text-emerald-400 underline"
      >
        Message Vendor
      </a>

      <BookingTimeline entries={booking.timeline} />
    </div>
  );
}
