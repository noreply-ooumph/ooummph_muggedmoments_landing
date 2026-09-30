/**
 * MuggedMoments — Public Vendor Profile Service (Stage 16, Phase 3)
 *
 * Pure mapping from a raw Vendor row (with relations) to the customer-safe public
 * profile shape. No I/O.
 *
 * CRITICAL RULES (mirroring publicMatchService.ts):
 * - contactPhone is never included — it is the vendor's private login identity.
 * - isDevelopmentSeed, createdAt, updatedAt are internal bookkeeping — never included.
 * - verificationStatus IS included and shown as plain fact — matching eligibility
 *   does not require VERIFIED (see matchingService.ts), so hiding it here would be
 *   dishonest, not protective. Never suppress or reinterpret it.
 * - No ranking, no "quality" framing — this is one vendor's own facts, not a
 *   comparison (comparison is Phase 5's job).
 * - `name` is the ANONYMIZED display label (getVendorDisplayName()), not the real
 *   business name — see that function's header comment for the full
 *   disintermediation-prevention reasoning and the reveal-threshold decision.
 *   This is the public directory / individual profile page's own name field, so
 *   it's the first and most important place this had to change.
 * - `documents` (brochures) are scanned for phone/email content on upload (see
 *   /api/vendor/documents/route.ts) before they ever reach the DB, so nothing
 *   extra needs to happen here — same trust boundary as portfolioItems.
 */

import type { VendorVerificationStatus } from "@prisma/client";
import { getVendorDisplayName } from "@/domain/vendorProfile/vendorDisplayName";

export interface RawPublicVendorRow {
  id: string;
  name: string;
  city: string;
  about: string | null;
  startingPrice: number | null;
  serviceAreas: string[];
  verificationStatus: VendorVerificationStatus;
  services: Array<{ service: { name: string; slug: string } }>;
  portfolioItems: Array<{ id: string; imagePath: string }>;
  documents: Array<{ id: string; filePath: string; originalFilename: string }>;
}

export interface PublicVendorProfile {
  id: string;
  name: string;
  city: string;
  about: string | null;
  startingPrice: number | null;
  serviceAreas: string[];
  verificationStatus: VendorVerificationStatus;
  services: string[];
  // Service slugs (config/services.ts's slug values, e.g. "photography") — added for
  // the "Start Planning" CTA on the public profile page, which pre-fills the
  // /plan-event form's initialServices via a ?services= query param. `services`
  // above (display names) is unchanged and still used for rendering.
  serviceSlugs: string[];
  portfolioItems: { id: string; imagePath: string }[];
  documents: { id: string; filePath: string; originalFilename: string }[];
}

export function toPublicVendorProfile(vendor: RawPublicVendorRow): PublicVendorProfile {
  return {
    id: vendor.id,
    name: getVendorDisplayName(vendor.city, vendor.services.map((vs) => vs.service.name)),
    city: vendor.city,
    about: vendor.about,
    startingPrice: vendor.startingPrice,
    serviceAreas: vendor.serviceAreas,
    verificationStatus: vendor.verificationStatus,
    services: vendor.services.map((vs) => vs.service.name),
    serviceSlugs: vendor.services.map((vs) => vs.service.slug),
    portfolioItems: vendor.portfolioItems.map((p) => ({ id: p.id, imagePath: p.imagePath })),
    documents: vendor.documents.map((d) => ({
      id: d.id,
      filePath: d.filePath,
      originalFilename: d.originalFilename,
    })),
  };
}
