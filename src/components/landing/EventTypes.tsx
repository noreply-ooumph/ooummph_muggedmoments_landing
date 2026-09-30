/**
 * MuggedMoments — Event Types Section Component
 *
 * Stage 1 ATTRACT & Stage 2 UNDERSTAND detailed event breakdown.
 */

"use client";

import React from "react";
import { EVENT_TYPES } from "@/config/content";
import { Button } from "@/components/ui";

interface EventTypesProps {
  onSelectEventType: (slug: string) => void;
}

export function EventTypes({ onSelectEventType }: EventTypesProps) {
  return (
    <section id="event-types" className="py-20 bg-zinc-950 border-t border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-semibold text-amber-400 tracking-wider mb-2">
            Tailored Experiences
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Specialized Vendor Matching for Every Occasion
          </h3>
          <p className="text-zinc-400 text-sm mt-3">
            Our matching engine applies custom criteria for weddings, corporate galas, and private celebrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {EVENT_TYPES.map((evt) => (
            <div
              key={evt.slug}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl mb-4">
                  {evt.icon}
                </div>
                <h4 className="text-xl font-bold text-white mb-2">{evt.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  {evt.description}
                </p>

                <div className="space-y-2 mb-6">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Popular Services Included:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {evt.popularServices.map((service) => (
                      <span
                        key={service}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectEventType(evt.slug)}
                className="w-full bg-zinc-900 hover:bg-amber-400 hover:text-zinc-950 border-zinc-700 text-zinc-200 transition-colors font-semibold text-xs py-2.5"
              >
                Find {evt.title} Vendors →
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
