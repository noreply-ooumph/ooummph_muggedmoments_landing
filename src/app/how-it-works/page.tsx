/**
 * MuggedMoments — /how-it-works
 *
 * Deliberately bounded content — see implementation brief. Reuses the
 * already-shipped PROCESS_STEPS copy from content.ts (the same steps already
 * live on the homepage's WhatHappensNext section) rather than inventing new
 * step wording. No "real customer stories" / "vendor success stories"
 * section — the source doc explicitly says that content waits until real
 * bookings exist, which they don't yet.
 */

import type { Metadata } from "next";
import { PROCESS_STEPS } from "@/config/content";

export const metadata: Metadata = {
  title: "How It Works",
  description: "How MuggedMoments matches you with the right vendors.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-10">
          How It Works
        </h1>

        <div className="flex flex-col gap-8 mb-10">
          {PROCESS_STEPS.map((step) => (
            <div key={step.step} className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm">
                {step.step}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">{step.title}</h2>
                <p className="text-zinc-300 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white mb-3">How verification works</h2>
        <p className="text-zinc-300 leading-relaxed">
          Every vendor completes a business and portfolio review before their
          profile is approved.
        </p>
      </main>
    </div>
  );
}
