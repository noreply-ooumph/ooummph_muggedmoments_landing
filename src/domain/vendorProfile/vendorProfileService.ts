/**
 * MuggedMoments — Vendor Profile Domain Logic (Stage 16, Phase 1)
 *
 * Deterministic, pure. No AI, no I/O — same discipline as vendorAuth/otpService.ts.
 */

export interface VendorProfileLike {
  about: string | null;
  startingPrice: number | null;
  serviceAreas: string[];
}

/**
 * A vendor's profile is "complete" only when all three fields are meaningfully
 * present: non-blank about text, a non-null starting price, and at least one
 * service area. Never promoted true speculatively.
 */
export function deriveProfileComplete(vendor: VendorProfileLike): boolean {
  const hasAbout = vendor.about !== null && vendor.about.trim().length > 0;
  const hasStartingPrice = vendor.startingPrice !== null;
  const hasServiceAreas = vendor.serviceAreas.length > 0;
  return hasAbout && hasStartingPrice && hasServiceAreas;
}
