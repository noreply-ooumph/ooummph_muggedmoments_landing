/**
 * MuggedMoments — Shared TypeScript Types
 * These types are the domain contract across frontend and backend.
 */

// ============================================================
// ATTRIBUTION
// ============================================================

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  landingPath?: string;
  capturedAt?: string; // ISO-8601
}

// ============================================================
// LEAD
// ============================================================

export type LeadStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MATCHED"
  | "CLOSED"
  | "INVALID";

export type CompletenessStatus = "PENDING" | "COMPLETE" | "INCOMPLETE";

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";

export interface DynamicAnswerMap {
  [questionKey: string]: string | number | boolean | string[] | null;
}

export interface CreateLeadInput {
  idempotencyKey: string;
  eventTypeSlug: string;
  // Customer-typed event name — only meaningful when eventTypeSlug === "other".
  // See src/lib/validation/schemas.ts's requireCustomEventTypeNameWhenOther.
  customEventTypeName?: string;
  city: string;
  locality?: string; // free-text area within the city — informational only, not a matching dimension
  eventDate?: string; // ISO-8601 date string
  guestCount?: number;
  budget?: string;
  services: string[];
  customerName: string;
  phone: string;
  whatsappConsent: boolean;
  attribution?: Attribution;
  dynamicAnswers?: DynamicAnswerMap;
}

export interface LeadResponse {
  leadId: string;
  publicLeadId: string;
  status: LeadStatus;
  completenessStatus: CompletenessStatus;
  missingFields: string[];
  score: number;
  matchedRules: ScoredRule[];
  scoreVersion: string;
  nextAction: LeadNextAction;
  qualificationStatus: QualificationStatus;
  matches: PublicVendorMatch[];
}

// Stage 9's qualification state machine — kept as a plain string union here (not
// imported from @prisma/client) because this file is shared with client components;
// importing the Prisma client type would pull the Prisma runtime into the browser
// bundle, which is unsupported (see dynamicQuestionRules.ts for the same constraint).
export type QualificationStatus =
  | "CAPTURED"
  | "INCOMPLETE"
  | "QUALIFICATION_PENDING"
  | "COMPLETE"
  | "QUALIFIED"
  | "MATCHING"
  | "ROUTED";

// Stage 15 (Discovery, minimal slice) — customer-safe vendor match shape. Deliberately
// excludes contactPhone and internal match reasons — see publicMatchService.ts.
// vendorId IS included (Stage 16, Phase 4) so the customer can navigate to the vendor's
// public profile page. startingPrice IS included (Stage 16, Phase 5) for the structured
// comparison table — null means the vendor hasn't set one, shown as-is, never defaulted
// to 0 or omitted from the type (0 and "not set" are different facts).
export interface PublicVendorMatch {
  vendorId: string;
  vendorName: string;
  city: string;
  services: string[];
  availability: AvailabilityStatus;
  startingPrice: number | null;
  // True once the vendor has actively responded with interest (VendorOpportunity
  // status INTERESTED/QUOTE_PENDING/QUOTE_SUBMITTED — see opportunityService.ts's
  // indicatesInterest()). Never true for DECLINED — a decline is deliberately never
  // surfaced to the customer as a negative signal, same policy as before this field
  // existed; this only ever adds a positive fact, never a discouraging one.
  vendorInterested: boolean;
}

export type LeadNextAction = "AWAITING_REVIEW" | "AWAITING_VENDOR_MATCH" | "MATCHED" | "INCOMPLETE";

// Customer-facing response shape — omits internal qualification signals (score,
// matchedRules) that should never be sent to the browser. See PART X of the PRD /
// domain principle: the score is an internal qualification signal, not a customer fact.
export type PublicLeadResponse = Omit<LeadResponse, "score" | "matchedRules">;

// ============================================================
// COMPLETENESS
// ============================================================

export interface CompletenessResult {
  status: CompletenessStatus;
  missingFields: string[];
  checkedFields: string[];
}

// ============================================================
// SCORING
// ============================================================

export interface ScoredRule {
  ruleId: string;
  weight: number;
  reason: string;
}

export interface ScoringResult {
  score: number;
  matchedRules: ScoredRule[];
  scoreVersion: string;
}

// ============================================================
// MATCHING
// ============================================================

export interface VendorMatchResult {
  vendorId: string;
  eligible: boolean;
  reasons: string[];
  availability: AvailabilityStatus;
}

export interface MatchingResult {
  leadId: string;
  matches: VendorMatchResult[];
  eligibleCount: number;
  executedAt: string; // ISO-8601
}

// ============================================================
// AUTOMATION
// ============================================================

export type AutomationStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "SKIPPED";

export type AutomationType =
  | "COMPLETENESS"
  | "SCORING"
  | "MATCHING"
  | "AVAILABILITY"
  | "WHATSAPP_HANDOFF"
  | "INCOMPLETE_REMINDER"
  | "OPPORTUNITY_DISPATCH"
  | "BOOKING_ACCEPTED_NOTIFICATION"
  | "BOOKING_REJECTED_NOTIFICATION"
  | "BOOKING_CANCELLED_NOTIFICATION";

// ============================================================
// API ERRORS
// ============================================================

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// ============================================================
// ANALYTICS
// ============================================================

// Kept as a const array (not just a union) so it can also back a runtime Zod schema
// (see /api/analytics) without duplicating the list — the resulting AnalyticsEvent
// type is identical to a plain string-literal union for every existing consumer.
export const ANALYTICS_EVENTS = [
  "page_view",
  "hero_cta_click",
  "secondary_cta_click",
  "event_type_select",
  "form_start",
  "form_field_complete",
  "form_submit_attempt",
  "lead_created",
  "lead_submit_success",
  "lead_submit_error",
  "whatsapp_handoff",
  "faq_open",
  "booking_request_submit_attempt",
  "booking_request_submitted",
  "booking_request_submit_error",
  "booking_cancel_attempt",
  "booking_cancel_success",
  "booking_cancel_error",
  "booking_cta_clicked",
  "booking_review_opened",
  "quote_viewed",
  "vendor_hero_cta_click",
  "vendor_faq_open",
  "service_nudge_shown",
  "service_nudge_accepted",
  "service_nudge_skipped",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  properties?: Record<string, string | number | boolean>;
  // IMPORTANT: never include PII in analytics payloads
}

// ============================================================
// FORM STATE (client-side only)
// ============================================================

export interface FormState {
  currentStep: number;
  totalSteps: number;
  values: Partial<CreateLeadInput>;
  idempotencyKey: string;
  attribution?: Attribution;
  savedAt?: string; // ISO-8601 — for expiry check
  version: number; // bump to invalidate stale saved state
}

export const FORM_STATE_VERSION = 1;
export const FORM_STATE_EXPIRY_HOURS = 24;
