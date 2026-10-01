/**
 * MuggedMoments — Trust & Reassurance Section Component
 *
 * Stage 5 REASSURE features.
 */

"use client";

import React from "react";
import { REASSURANCE_POINTS } from "@/config/content";
import {
  getApprovedTrustClaims,
  TRUST_SECTION_EMPTY_STATE,
} from "@/config/trustClaims";

export function TrustSection() {
  // Only APPROVED, non-expired claims ever reach this array — see
  // trustClaims.ts's own filtering. Today this is empty (the one seeded
  // claim is PENDING_VERIFICATION, not APPROVED); the honest empty-state
  // copy below renders in that case instead of leaving the section bare.
  const approvedClaims = getApprovedTrustClaims("homepage_trust_section");

  return (
    <section id="reassurance" className="py-20 bg-transparent border-t border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-semibold text-amber-400 tracking-wider mb-2">
            Why Event Hosts Trust Us
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Designed to Protect Your Privacy & Peace of Mind
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASSURANCE_POINTS.map((pt) => (
            <div
              key={pt.title}
              className="p-6 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:border-amber-500/40 rounded-xl shadow-xl transition-all duration-200 hover:-translate-y-1"
            >
              <div className="text-3xl mb-3">{pt.icon}</div>
              <h4 className="text-base font-bold text-white mb-2">{pt.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{pt.description}</p>
            </div>
          ))}
        </div>

        {approvedClaims.length > 0 ? (
          <div className="mt-8 flex flex-col gap-3 max-w-2xl mx-auto">
            {approvedClaims.map((claim) => (
              <p key={claim.claimId} className="text-sm text-zinc-300 text-center">
                {claim.claimText}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-zinc-400 text-center max-w-xl mx-auto">
            {TRUST_SECTION_EMPTY_STATE}
          </p>
        )}
      </div>
    </section>
  );
}
