/**
 * MuggedMoments — Booking Request Domain Logic (Stage 19, Phase 19.1)
 *
 * Deterministic, pure. No AI, no I/O — same discipline as opportunityService.ts,
 * which this file mirrors directly: ALLOWED_TRANSITIONS map, nextStatus(), a
 * read-time isExpired() (never a stored/scheduled expiry flip).
 *
 * Phase 19.0 deliberately deferred this file because only one real transition
 * existed (creation into REQUESTED). This phase adds two more (ACCEPT, REJECT),
 * crossing the threshold that justified opportunityService.ts's own state machine.
 */

export type BookingRequestStatusValue = "REQUESTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type BookingRequestAction = "ACCEPT" | "REJECT";

const ALLOWED_TRANSITIONS: Record<
  BookingRequestStatusValue,
  Partial<Record<BookingRequestAction, BookingRequestStatusValue>>
> = {
  REQUESTED: { ACCEPT: "ACCEPTED", REJECT: "REJECTED" },
  UNDER_REVIEW: {}, // reserved status — nothing sets it yet, no transitions defined
  ACCEPTED: {},
  REJECTED: {},
  EXPIRED: {},
};

/**
 * Returns the resulting status for a transition, or null if the transition is
 * not allowed from the current status. Never throws — callers decide how to
 * respond to an illegal transition (e.g. 409 INVALID_BOOKING_REQUEST_TRANSITION).
 */
export function nextBookingRequestStatus(
  current: BookingRequestStatusValue,
  action: BookingRequestAction
): BookingRequestStatusValue | null {
  return ALLOWED_TRANSITIONS[current][action] ?? null;
}

export interface BookingRequestLike {
  status: BookingRequestStatusValue;
  responseDeadline: Date;
}

/**
 * A still-open request (REQUESTED) whose deadline has passed is expired. Once
 * accepted/rejected, never "expired" — a real decision was already recorded.
 * Exactly mirrors opportunityService.ts::isExpired().
 */
export function isBookingRequestExpired(request: BookingRequestLike, now: Date): boolean {
  return request.status === "REQUESTED" && now.getTime() > request.responseDeadline.getTime();
}

export type RejectionReasonCode =
  | "DATE_NO_LONGER_AVAILABLE"
  | "BUDGET_MISMATCH"
  | "OUTSIDE_SERVICE_AREA"
  | "OTHER";

export const REJECTION_REASONS: { value: RejectionReasonCode; label: string }[] = [
  { value: "DATE_NO_LONGER_AVAILABLE", label: "Date is no longer available" },
  { value: "BUDGET_MISMATCH", label: "Budget does not match this booking" },
  { value: "OUTSIDE_SERVICE_AREA", label: "Unable to service this location" },
  { value: "OTHER", label: "Other" },
];

/**
 * Resolves the exact string persisted to BookingRequest.rejectionReason —
 * the fixed label for the first three codes, or the vendor's own note verbatim
 * for OTHER. Callers are responsible for ensuring a non-empty note accompanies
 * OTHER (enforced by RejectBookingRequestSchema before this is ever called).
 */
export function resolveRejectionReasonText(reason: RejectionReasonCode, note: string | undefined): string {
  if (reason === "OTHER") return (note ?? "").trim();
  return REJECTION_REASONS.find((r) => r.value === reason)!.label;
}
