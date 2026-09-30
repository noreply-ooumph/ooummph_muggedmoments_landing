/**
 * MuggedMoments — Match List (Stage 15, Discovery — minimal slice)
 *
 * Renders the customer-safe vendor matches for a lead, driven entirely by
 * qualificationStatus (the already-computed Stage 9 signal) — no separate logic
 * re-derives "does this lead have matches."
 *
 * Used by both SuccessConfirmation.tsx (immediate post-submit) and the
 * /status/[publicLeadId] page (returning visitor via tracking code) — one
 * implementation, two call sites.
 *
 * CRITICAL: Eligible ≠ Available ≠ Recommended. Availability is always rendered as one
 * of three distinct, honestly-labeled states — UNKNOWN is never shown as available.
 * No vendor is ever ranked or labeled BEST/TOP/RECOMMENDED.
 */

"use client";

import React from "react";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { MatchComparisonTable } from "./MatchComparisonTable";
import type { PublicVendorMatch, QualificationStatus } from "@/types";

interface MatchListProps {
  qualificationStatus: QualificationStatus;
  matches: PublicVendorMatch[];
  // Suppress the generic INCOMPLETE note when the caller already renders its own,
  // more specific incomplete-state UI immediately alongside this component (e.g.
  // SuccessConfirmation's exact-missing-fields resume form) — avoids saying the same
  // thing twice on one page. The standalone status page has no such UI, so it omits
  // this prop and keeps the note.
  suppressIncompleteNote?: boolean;
}

export const AVAILABILITY_LABEL: Record<PublicVendorMatch["availability"], string> = {
  AVAILABLE: "Available for your date",
  UNAVAILABLE: "Not available for your date",
  UNKNOWN: "Availability not yet confirmed",
};

const AVAILABILITY_STYLE: Record<PublicVendorMatch["availability"], string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  UNAVAILABLE: "bg-red-500/10 text-red-400 border-red-500/30",
  UNKNOWN: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
};

export function MatchList({
  qualificationStatus,
  matches,
  suppressIncompleteNote = false,
}: MatchListProps) {
  if (qualificationStatus === "ROUTED" && matches.length > 0) {
    return (
      <div className="space-y-3 mb-6">
        <MatchComparisonTable matches={matches} />
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          {matches.length} Matched Vendor{matches.length === 1 ? "" : "s"}
        </h3>
        {/*
          One general, static sentence — deliberately NOT per-vendor and NOT
          derived from LeadVendorMatch.reasons (those are internal debugging
          strings that must never reach the customer, per
          publicMatchService.ts's own documented rule).
          CORRECTED (discovered while building the Stage 21 backfill-matching
          feature, verified fresh against matching-rules.ts and
          matchingService.ts): eligibility is city-must-not-mismatch PLUS at
          least 1 total dimension match (MATCHING_CONFIG.minimumMatchCount is 1,
          not 3) — city alone already satisfies that, so this sentence
          previously overstated the rule by implying event-type is a real,
          independently-required signal. It also can never actually be true:
          VendorService rows are always created with eventTypes: [] at vendor
          registration and nothing else in this codebase ever populates that
          array, so the event_type dimension can structurally never match for
          any vendor. Dropped "handle your event type" from the copy rather
          than ship a claim that's never actually true.
        */}
        <p className="text-xs text-zinc-500">
          These vendors matched because they serve your city and offer the
          services you requested.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {matches.map((match, index) => (
            <div
              key={`${match.vendorName}-${index}`}
              className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-zinc-100">{match.vendorName}</p>
                  <p className="text-xs text-zinc-500">{match.city}</p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${AVAILABILITY_STYLE[match.availability]}`}
                >
                  {AVAILABILITY_LABEL[match.availability]}
                </span>
              </div>
              {/*
                Honest positive-only signal — never shown for a vendor who declined
                (see PublicVendorMatch.vendorInterested's doc comment and
                opportunityService.ts's indicatesInterest()). This is the fix for the
                reported gap: a vendor marking "Interested" in their dashboard
                previously never reached the customer anywhere in this UI.
              */}
              {match.vendorInterested && (
                <p className="text-xs font-medium text-emerald-400 mb-1">
                  ✓ This vendor is interested in your event
                </p>
              )}
              {match.services.length > 0 && (
                <p className="text-xs text-zinc-400">
                  {match.services.join(", ")}
                </p>
              )}
              <Link
                href={`/vendors/${match.vendorId}`}
                className="mt-2 inline-block text-xs text-zinc-400 underline hover:text-zinc-200"
              >
                View Profile
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Defensive: ROUTED should only ever be set alongside at least one eligible match
  // (see qualificationService.ts's transition table) — if this is ever observed, it
  // means the two signals disagree, so say so plainly rather than implying "still
  // processing" (which would be inaccurate — a decision has already been made).
  if (qualificationStatus === "ROUTED" && matches.length === 0) {
    return (
      <div className="mb-6">
        <Alert type="warning">
          We found a match, but couldn&apos;t load the details right now. Please check back
          shortly or contact support with your reference code.
        </Alert>
      </div>
    );
  }

  if (qualificationStatus === "QUALIFIED") {
    return (
      <div className="mb-6">
        <Alert type="info" title="Still looking for a match">
          We&apos;re still checking for eligible vendors for your requirements. We&apos;ll follow
          up as soon as we find a match.
        </Alert>
      </div>
    );
  }

  if (qualificationStatus === "INCOMPLETE") {
    if (suppressIncompleteNote) return null;
    return (
      <div className="mb-6">
        <Alert type="warning">
          We still need a few details from you before we can show matches. If you have
          your original confirmation page open, you can complete your request there.
        </Alert>
      </div>
    );
  }

  // CAPTURED / QUALIFICATION_PENDING / MATCHING — transient states that should rarely
  // be the resting value a customer observes (the pipeline resolves these synchronously
  // within one request today), but must render something honest rather than nothing.
  return (
    <div className="mb-6">
      <Alert type="info">We&apos;re processing your request.</Alert>
    </div>
  );
}
