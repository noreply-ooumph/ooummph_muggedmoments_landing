/**
 * MuggedMoments — Public Match Service (Stage 15, Discovery — minimal slice)
 *
 * Pure mapping from raw LeadVendorMatch rows to the customer-safe shape. No I/O.
 *
 * CRITICAL RULES (mirroring matchingService.ts / availabilityService.ts):
 * - Only eligible: true rows are ever returned — ineligible vendors and their match
 *   `reasons` (internal debugging strings like CITY_MISMATCH) never reach the customer.
 * - availability is passed straight through, never transformed — UNKNOWN stays UNKNOWN,
 *   never promoted to AVAILABLE.
 * - No ranking, no sorting by "quality" — natural order only. No BEST/TOP/RECOMMENDED.
 * - vendorId IS included (Stage 16, Phase 4) so the customer can navigate to the
 *   public vendor profile page — it is the same id already public in that page's own
 *   URL, not an internal secret. contactPhone remains excluded.
 * - startingPrice IS included (Stage 16, Phase 5) — a vendor-set fact, passed through
 *   unchanged; null means "not set," never coerced to 0.
 * - vendorInterested IS included — whether the vendor has actively responded with
 *   interest (see opportunityService.ts's indicatesInterest()). The caller computes
 *   this boolean (it requires joining VendorOpportunity, a separate table from
 *   LeadVendorMatch) and passes it in already-resolved, same as every other field
 *   here — this function stays a pure mapping, no I/O.
 * - vendorName is the ANONYMIZED display label (getVendorDisplayName()), not the
 *   real business name — see that function's header comment. "View Profile"
 *   still links to /vendors/[vendorId], which now shows the same anonymized
 *   label (see publicVendorProfileService.ts), so this page never reveals more
 *   than the match card already does.
 */

import type { AvailabilityStatus, PublicVendorMatch } from "@/types";
import { getVendorDisplayName } from "@/domain/vendorProfile/vendorDisplayName";

export interface RawMatchRow {
  eligible: boolean;
  availability: AvailabilityStatus;
  vendorInterested: boolean;
  vendor: {
    id: string;
    name: string;
    city: string;
    services: Array<{ service: { name: string } }>;
    startingPrice: number | null;
  };
}

export function toPublicMatches(rows: RawMatchRow[]): PublicVendorMatch[] {
  return rows
    .filter((row) => row.eligible)
    .map((row) => ({
      vendorId: row.vendor.id,
      vendorName: getVendorDisplayName(
        row.vendor.city,
        row.vendor.services.map((vs) => vs.service.name)
      ),
      city: row.vendor.city,
      services: row.vendor.services.map((vs) => vs.service.name),
      availability: row.availability,
      startingPrice: row.vendor.startingPrice,
      vendorInterested: row.vendorInterested,
    }));
}
