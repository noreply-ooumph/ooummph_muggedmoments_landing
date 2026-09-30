/**
 * MuggedMoments — Landing Hero Component
 *
 * Stage 1 ATTRACT & Stage 2 UNDERSTAND entry point.
 * High-conversion hero banner with event pre-selectors.
 */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HERO_CONTENT, EVENT_TYPES } from "@/config/content";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics";

interface HeroProps {
  onSelectEventType: (slug: string) => void;
  onPrimaryCta: () => void;
}

export function Hero({ onSelectEventType, onPrimaryCta }: HeroProps) {
  const router = useRouter();

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[200px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Stage 1 Attract Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          {HERO_CONTENT.badge}
        </div>

        {/* Headline & Subheadline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
          {HERO_CONTENT.title}{" "}
          <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            {HERO_CONTENT.titleHighlight}
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          {HERO_CONTENT.subtitle}
        </p>

        {/* Primary / Secondary CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              onPrimaryCta();
              track("hero_cta_click", { label: HERO_CONTENT.primaryCta });
            }}
          >
            {HERO_CONTENT.primaryCta}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              track("secondary_cta_click", { label: HERO_CONTENT.secondaryCta });
              router.push("/vendors");
            }}
          >
            {HERO_CONTENT.secondaryCta}
          </Button>
        </div>

        {/* Quick Preselection CTAs */}
        <div className="mt-10 max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-4">
            Select Your Event Type to Get Matched Instantly:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {EVENT_TYPES.map((evt) => (
              <button
                key={evt.slug}
                onClick={() => onSelectEventType(evt.slug)}
                className="group relative p-5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 rounded-xl text-left transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{evt.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700 group-hover:border-amber-500/40">
                      Pre-select
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {evt.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Start Matching</span>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trust Stats bar */}
        <div className="mt-14 pt-8 border-t border-zinc-800/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-zinc-400 max-w-4xl mx-auto">
          <div>
            <div className="text-2xl font-bold text-white">100% Free</div>
            <div className="text-xs text-zinc-400">No Booking Fees</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">Vetted Only</div>
            <div className="text-xs text-zinc-400">Verified Local Pros</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">Zero Spam</div>
            <div className="text-xs text-zinc-400">Strict Data Privacy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">Direct Match</div>
            <div className="text-xs text-zinc-400">Deterministic Engine</div>
          </div>
        </div>
      </div>
    </section>
  );
}
