/**
 * MuggedMoments — Vendor Opportunity Domain Logic (Stage 18, Phase 18.0)
 *
 * Deterministic state machine. No AI, no I/O — same discipline as otpService.ts
 * and vendorProfileService.ts.
 *
 * Expiration is a read-time derived fact (isExpired()), never a stored transition —
 * this codebase has no background job runner to flip a status when a deadline passes.
 */

export type VendorOpportunityStatus =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "INTERESTED"
  | "DECLINED"
  | "QUOTE_PENDING"
  | "QUOTE_SUBMITTED";
export type VendorOpportunityAction = "VIEW" | "INTERESTED" | "DECLINE" | "START_QUOTE" | "SUBMIT_QUOTE";

const RESPONSE_DEADLINE_HOURS = 48;

const ALLOWED_TRANSITIONS: Record<
  VendorOpportunityStatus,
  Partial<Record<VendorOpportunityAction, VendorOpportunityStatus>>
> = {
  CREATED: {},
  SENT: { VIEW: "VIEWED" },
  VIEWED: { INTERESTED: "INTERESTED", DECLINE: "DECLINED" },
  INTERESTED: { START_QUOTE: "QUOTE_PENDING" },
  DECLINED: {},
  QUOTE_PENDING: { SUBMIT_QUOTE: "QUOTE_SUBMITTED" },
  QUOTE_SUBMITTED: {},
};

/**
 * Returns the resulting status for a transition, or null if the transition is
 * not allowed from the current status. Never throws — callers decide how to
 * respond to an illegal transition (e.g. 422 INVALID_OPPORTUNITY_TRANSITION).
 */
export function nextStatus(
  current: VendorOpportunityStatus,
  action: VendorOpportunityAction
): VendorOpportunityStatus | null {
  return ALLOWED_TRANSITIONS[current][action] ?? null;
}

export function getResponseDeadline(now: Date): Date {
  return new Date(now.getTime() + RESPONSE_DEADLINE_HOURS * 60 * 60 * 1000);
}

export interface OpportunityLike {
  status: VendorOpportunityStatus;
  responseDeadline: Date;
}

/**
 * A still-open opportunity (SENT or VIEWED) whose deadline has passed is expired.
 * Once a vendor has actually responded (INTERESTED/DECLINED), it is never "expired" —
 * a real decision was already recorded.
 */
export function isExpired(opportunity: OpportunityLike, now: Date): boolean {
  const stillOpen = opportunity.status === "SENT" || opportunity.status === "VIEWED";
  return stillOpen && now.getTime() > opportunity.responseDeadline.getTime();
}

/**
 * True once a vendor has actively responded with interest — i.e. progressed past
 * VIEWED down the INTERESTED branch (INTERESTED, QUOTE_PENDING, QUOTE_SUBMITTED).
 * Deliberately excludes DECLINED — a decline is a real response but not "interest,"
 * and is never surfaced to the customer as a discouraging signal (see
 * publicMatchService.ts / MatchList.tsx). Used to compute PublicVendorMatch's
 * customer-facing vendorInterested flag.
 */
export function indicatesInterest(status: VendorOpportunityStatus): boolean {
  return status === "INTERESTED" || status === "QUOTE_PENDING" || status === "QUOTE_SUBMITTED";
}
