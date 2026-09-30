/**
 * MuggedMoments — Booking Timeline (Stage 19, Phase 19.4)
 *
 * Display-only, no client state — same posture as ConfirmedBookingCard.tsx and
 * BookingRecoveryBanner.tsx. Shared by both the customer status page and the
 * vendor booking-request detail page. Renders every entry generically (never
 * hardcoded to "one entry") so it needs no changes when a future phase adds
 * more BookingStatus values and history rows.
 */

import type { PublicBookingTimelineEntry } from "@/domain/booking/bookingTimelineService";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export function BookingTimeline({ entries }: { entries: PublicBookingTimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {entries.map((entry, index) => (
        <div key={index} className="flex gap-2 text-xs">
          <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="text-zinc-300 font-medium">{STATUS_LABEL[entry.status] ?? entry.status}</p>
            {entry.note && <p className="text-zinc-500">{entry.note}</p>}
            <p className="text-zinc-600">{new Date(entry.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
