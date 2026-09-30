/**
 * MuggedMoments — /about
 *
 * Deliberately bounded content — see implementation brief. No team/founders
 * section (no such content exists in any source document), no fabricated
 * verification specifics beyond what's actually built and confirmed
 * (decision #2 in the business-decisions round: business + portfolio review,
 * manual approval — matches the live admin approve/reject workflow exactly).
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "MuggedMoments connects people planning events with venues and event professionals.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-6">
          About MuggedMoments
        </h1>

        <p className="text-zinc-300 leading-relaxed mb-8">
          MuggedMoments connects people planning events with venues and event
          professionals, while providing the tools to move from discovery and
          planning to booking and event execution.
        </p>

        <h2 className="text-xl font-bold text-white mb-3">How verification works</h2>
        <p className="text-zinc-300 leading-relaxed mb-8">
          Every vendor completes a business and portfolio review before their
          profile is approved.
        </p>

        <div className="flex gap-6 text-sm text-zinc-400">
          <a href="/privacy" className="hover:text-amber-400 underline">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-amber-400 underline">
            Terms of Service
          </a>
        </div>
      </main>
    </div>
  );
}
