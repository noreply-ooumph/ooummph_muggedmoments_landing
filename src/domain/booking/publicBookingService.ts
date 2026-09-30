/**
 * MuggedMoments — Public Booking Service (Stage 19, Phase 19.2)
 *
 * Pure mapping from a confirmed Booking (+ its originating vendor/quote) to the
 * customer-safe shape. No I/O. Mirrors publicQuoteService.ts /
 * publicBookingRequestService.ts — one pure mapper per public-facing entity.
 *
 * A Booking is distinct from a BookingRequest: it only exists once accepted.
 *
 * Stage 19, Phase 19.4 — `timeline` is a nested array mapped internally, the
 * same pattern publicQuoteService.ts already uses for `messages`: the caller
 * passes raw Prisma rows straight through, this mapper owns all Date->string
 * conversion.
 *
 * Stage 19, Phase 19.5 — `status` is now exposed. Phase 19.2's original
 * decision to omit it was explicitly conditioned on BookingStatus having
 * exactly one value (CONFIRMED); that condition no longer holds now that
 * CANCELLED exists, so the omission is corrected here rather than carried
 * forward incorrectly.
 *
 * vendorName is the ONE place in the customer-facing pipeline that
 * deliberately shows the REAL business name, not the anonymized
 * getVendorDisplayName() label used everywhere else (matches, quotes,
 * booking requests, the public directory/profile pages) — see that
 * function's header comment for the full reveal-threshold reasoning. A
 * Booking row only ever exists once a request has been accepted, so by the
 * time this mapper runs, the customer is legitimately about to receive
 * service from this vendor in the real world; hiding the name at this point
 * would be pointless, not protective. Do not anonymize this field.
 */

import {
  toPublicBookingTimelineEntry,
  type RawBookingStatusHistoryEntry,
  type PublicBookingTimelineEntry,
  type PublicBookingStatus,
} from "@/domain/booking/bookingTimelineService";

export interface RawBookingRow {
  publicBookingId: string;
  vendorId: string;
  vendorName: string;
  date: Date;
  quoteTotal: number; // calculateTotal() of the confirmed QuoteVersion's lineItems, computed by the caller
  createdAt: Date;
  timeline: RawBookingStatusHistoryEntry[];
  status: PublicBookingStatus;
}

export interface PublicBooking {
  publicBookingId: string;
  vendorId: string;
  vendorName: string;
  date: string;
  quoteTotal: number;
  createdAt: string;
  timeline: PublicBookingTimelineEntry[];
  status: PublicBookingStatus;
}

export function toPublicBooking(row: RawBookingRow): PublicBooking {
  return {
    publicBookingId: row.publicBookingId,
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    date: row.date.toISOString(),
    quoteTotal: row.quoteTotal,
    createdAt: row.createdAt.toISOString(),
    timeline: row.timeline.map(toPublicBookingTimelineEntry),
    status: row.status,
  };
}
