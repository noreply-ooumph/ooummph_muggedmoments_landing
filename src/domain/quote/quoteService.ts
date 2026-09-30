/**
 * MuggedMoments — Vendor Quote Domain Logic (Stage 18, Phase 18.1)
 *
 * Deterministic, pure. No AI, no I/O — same discipline as otpService.ts and
 * opportunityService.ts.
 */

export interface QuoteLineItemLike {
  label: string;
  amount: number;
}

export function calculateTotal(lineItems: QuoteLineItemLike[]): number {
  return lineItems.reduce((sum, item) => sum + item.amount, 0);
}

export type QuoteAvailabilityState = "AVAILABLE" | "PENDING_CONFIRMATION" | "UNAVAILABLE" | "UNKNOWN";

export interface QuoteSubmissionCheck {
  lineItems: QuoteLineItemLike[];
  availabilityState: QuoteAvailabilityState;
  validUntil: Date | null;
}

export type QuoteValidationFailureReason =
  | "NO_LINE_ITEMS"
  | "INVALID_LINE_ITEM_AMOUNT"
  | "AVAILABILITY_NOT_SET"
  | "VALID_UNTIL_MISSING"
  | "VALID_UNTIL_IN_PAST";

/**
 * A quote is submittable only when every §18.9 checkpoint is genuinely satisfied —
 * UNKNOWN is not an acceptable submitted availability state (it defeats the point of
 * asking the vendor to confirm availability for this specific quote).
 */
export function getSubmissionFailureReasons(
  quote: QuoteSubmissionCheck,
  now: Date
): QuoteValidationFailureReason[] {
  const reasons: QuoteValidationFailureReason[] = [];

  if (quote.lineItems.length === 0) reasons.push("NO_LINE_ITEMS");
  if (quote.lineItems.some((item) => !Number.isInteger(item.amount) || item.amount < 0)) {
    reasons.push("INVALID_LINE_ITEM_AMOUNT");
  }
  if (quote.availabilityState === "UNKNOWN") reasons.push("AVAILABILITY_NOT_SET");
  if (!quote.validUntil) reasons.push("VALID_UNTIL_MISSING");
  else if (quote.validUntil.getTime() <= now.getTime()) reasons.push("VALID_UNTIL_IN_PAST");

  return reasons;
}
