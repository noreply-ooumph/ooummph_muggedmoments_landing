/**
 * MuggedMoments — Trust Claim Registry
 *
 * Implements the trust-claim governance model from the Developer
 * Implementation & Launch Closure Specification (§16, §31): every
 * public-facing factual claim must carry a source and an explicit approval
 * status before it can render, and ONLY status "APPROVED" claims are ever
 * shown — DRAFT/PENDING_VERIFICATION/EXPIRED/REJECTED are always excluded,
 * no matter how plausible the claim text looks.
 *
 * This is deliberately a plain, human-edited config file, not a database
 * table with its own admin UI — matching the "content/config layer" pattern
 * the spec itself describes (§32), and appropriate for the current volume of
 * claims (one, pending). If claim volume grows enough that a human editing
 * this file directly becomes unwieldy, that's a real reason to build a DB
 * table + admin page for it later — not something to build speculatively now.
 *
 * IMPORTANT: nobody should ever flip a claim's status to "APPROVED" in this
 * file without someone who actually owns the claim (Product/Ops/Legal as
 * relevant) having reviewed the evidence and set approvedBy/approvalDate.
 * An engineer editing this file is not the approval.
 */

export type TrustClaimStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "APPROVED"
  | "EXPIRED"
  | "REJECTED";

export interface TrustClaim {
  claimId: string;
  claimText: string;
  claimType: "process" | "count" | "testimonial" | "case_study" | "logo" | "certification";
  source: string;
  evidenceFile?: string;
  evidenceDate?: string;
  validUntil?: string;
  approvedBy?: string;
  approvalDate?: string;
  status: TrustClaimStatus;
  displayLocation?: string;
}

/**
 * Seed entry only — NOT approved. The claim text describes the actual
 * verification workflow that exists in the codebase today (the /admin/vendors
 * approve/reject flow), but "the underlying fact is technically true" is not
 * the same thing as "a claim owner reviewed and approved this for public
 * display" — those are deliberately kept separate. Leave this as
 * PENDING_VERIFICATION until someone who owns trust/marketing copy actually
 * approves it.
 */
export const TRUST_CLAIMS: TrustClaim[] = [
  {
    claimId: "vendor_verified_process",
    claimText:
      "Every vendor and venue goes through our verification process before being listed.",
    claimType: "process",
    source: "internal_policy_document",
    status: "PENDING_VERIFICATION",
    displayLocation: "homepage_trust_section",
  },
];

/**
 * Honest empty-state copy for the trust section, shown ONLY when
 * getApprovedTrustClaims() returns zero claims (today's actual state — the
 * one seed claim above is PENDING_VERIFICATION, not APPROVED).
 *
 * Sourced from the "MuggedMoments — Legal, Trust & SEO Developer Package"
 * doc's empty-state pattern: say what's true about the process, never leave
 * the section blank, never fabricate a number/testimonial to fill it. The
 * source copy included a 【city】 bracket — deliberately dropped here rather
 * than guessed, since no real launch city is established anywhere else in
 * this codebase yet (confirmed: no other file references one). Add the
 * city-specific variant once that's a real, confirmed fact.
 */
export const TRUST_SECTION_EMPTY_STATE =
  "New on MuggedMoments. We're onboarding our first verified venues and vendors. Every listing is checked before it goes live.";

/**
 * The only function anything should call to get trust claims for display.
 * Filters to APPROVED only, and further excludes anything past its
 * validUntil date (an approved claim doesn't stay true forever).
 */
export function getApprovedTrustClaims(displayLocation?: string): TrustClaim[] {
  const now = new Date();
  return TRUST_CLAIMS.filter((claim) => {
    if (claim.status !== "APPROVED") return false;
    if (claim.validUntil && new Date(claim.validUntil) < now) return false;
    if (displayLocation && claim.displayLocation !== displayLocation) return false;
    return true;
  });
}
