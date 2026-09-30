/**
 * MuggedMoments — Booking Timeline Service (Stage 19, Phase 19.4)
 *
 * Pure mapping from a Booking's BookingStatusHistory rows to the customer/vendor-
 * safe shape. No I/O. This is a UI-facing projection of one specific booking's own
 * lifecycle — distinct from, and not a replacement for, the internal Stage 14
 * Lead-level timeline (funnelService.ts::getLeadTimeline), which serves a
 * different purpose (ops reporting across AuditLog + AnalyticsEvent).
 *
 * BookingStatus mirrors the schema enum honestly (CONFIRMED, and — as of
 * Stage 19, Phase 19.5 — CANCELLED) rather than inventing values that don't
 * exist.
 */

export type PublicBookingStatus = "CONFIRMED" | "CANCELLED";

export interface RawBookingStatusHistoryEntry {
  status: PublicBookingStatus;
  note: string | null;
  createdAt: Date;
}

export interface PublicBookingTimelineEntry {
  status: PublicBookingStatus;
  note: string | null;
  createdAt: string;
}

export function toPublicBookingTimelineEntry(
  row: RawBookingStatusHistoryEntry
): PublicBookingTimelineEntry {
  return {
    status: row.status,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
