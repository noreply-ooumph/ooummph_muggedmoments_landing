/**
 * MuggedMoments — Public Quote Service (Stage 18, Phase 18.2/18.4/18.5)
 *
 * Pure mapping from a raw VendorOpportunity+Quote+Vendor row (already filtered to
 * status: QUOTE_SUBMITTED by the caller, and already resolved to its *current*
 * QuoteVersion via quoteVersionService.ts's getCurrentVersion()) to the
 * customer-safe shape. No I/O.
 *
 * CRITICAL RULES (mirroring publicMatchService.ts / publicVendorProfileService.ts):
 * - contactPhone is never included.
 * - No ranking, no "best value" framing — this is one vendor's own submitted facts.
 * - total is derived via the existing calculateTotal() from quoteService.ts, never
 *   recomputed a second way — one source of truth for the sum.
 * - versionNumber IS included (Stage 18, Phase 18.4) so the customer can tell a quote
 *   has been revised — never hidden, never silently overwritten history.
 * - messages IS included (Stage 18, Phase 18.5) and attaches to the Quote parent, not
 *   the QuoteVersion — a conversation survives a revision, it is not versioned itself.
 * - vendorName is the ANONYMIZED display label (getVendorDisplayName()), computed
 *   from city + services — NOT row.vendorName, which stays in the raw input shape
 *   only because every caller already supplies it (no caller changes needed) but is
 *   otherwise unused here. See that function's header comment for why: a submitted
 *   quote is exactly the moment a customer would be most tempted to Google a real
 *   vendor name instead of booking through the platform.
 */

import { calculateTotal } from "@/domain/quote/quoteService";
import { getVendorDisplayName } from "@/domain/vendorProfile/vendorDisplayName";

export type PublicQuoteAvailabilityState = "AVAILABLE" | "PENDING_CONFIRMATION" | "UNAVAILABLE" | "UNKNOWN";

export interface PublicQuoteMessage {
  senderType: "CUSTOMER" | "VENDOR";
  body: string;
  createdAt: string;
}

export interface RawSubmittedQuoteRow {
  vendorId: string;
  vendorName: string;
  city: string;
  services: Array<{ service: { name: string } }>;
  submittedAt: Date | null;
  // Quote-parent-level, not versioned — ordered oldest-first by the caller's query.
  messages: Array<{ senderType: "CUSTOMER" | "VENDOR"; body: string; createdAt: Date }>;
  quote: {
    versionNumber: number;
    availabilityState: PublicQuoteAvailabilityState;
    validUntil: Date | null;
    included: string[];
    excluded: string[];
    lineItems: Array<{ label: string; amount: number }>;
  };
}

export interface PublicQuote {
  vendorId: string;
  vendorName: string;
  city: string;
  services: string[];
  total: number;
  availabilityState: PublicQuoteAvailabilityState;
  validUntil: string | null;
  included: string[];
  excluded: string[];
  submittedAt: string | null;
  versionNumber: number;
  messages: PublicQuoteMessage[];
}

export function toPublicQuote(row: RawSubmittedQuoteRow): PublicQuote {
  return {
    vendorId: row.vendorId,
    vendorName: getVendorDisplayName(row.city, row.services.map((vs) => vs.service.name)),
    city: row.city,
    services: row.services.map((vs) => vs.service.name),
    total: calculateTotal(row.quote.lineItems),
    availabilityState: row.quote.availabilityState,
    validUntil: row.quote.validUntil ? row.quote.validUntil.toISOString() : null,
    included: row.quote.included,
    excluded: row.quote.excluded,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    versionNumber: row.quote.versionNumber,
    messages: row.messages.map((m) => ({
      senderType: m.senderType,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
