/**
 * MuggedMoments — What Happens Next Component
 *
 * Stage 5 REASSURE section explaining the transparent process.
 */

"use client";

import React from "react";
import { PROCESS_STEPS } from "@/config/content";

export function WhatHappensNext() {
  return (
    <section id="how-it-works" className="py-20 bg-zinc-900/40 border-t border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-semibold text-amber-400 tracking-wider mb-2">
            Stage 5 Reassurance Guarantee
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How MuggedMoments Matching Works
          </h3>
          <p className="text-zinc-400 text-sm mt-3">
            No endless spam, no hidden commissions. Pure deterministic compatibility matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.step}
              className="relative p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm mb-5">
                  {step.step}
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] font-medium text-amber-400/90">
                <span>✓</span>
                <span>Verified System Standard</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
