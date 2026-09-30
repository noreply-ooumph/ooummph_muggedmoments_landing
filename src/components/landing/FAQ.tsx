/**
 * MuggedMoments — FAQ Component
 *
 * Frequently Asked Questions section with expandable items.
 */

"use client";

import React, { useState } from "react";
import { FAQ_ITEMS } from "@/config/content";
import { track } from "@/lib/analytics";

interface FAQProps {
  title?: string;
  items?: Array<{ question: string; answer: string }>;
}

export function FAQ({ title, items }: FAQProps) {
  const faqItems = items ?? FAQ_ITEMS;
  const titleValue = title ?? "Everything You Need to Know";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    const opening = openIndex !== idx;
    setOpenIndex(opening ? idx : null);
    if (opening) {
      track("faq_open", { question: faqItems[idx].question });
    }
  };

  return (
    <section id="faq" className="py-20 bg-zinc-900/60 border-t border-zinc-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase font-semibold text-amber-400 tracking-wider mb-2">
            Frequently Asked Questions
          </h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            {titleValue}
          </h3>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <div
              key={item.question}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none focus:bg-zinc-850"
              >
                <span className="font-semibold text-zinc-100 text-sm sm:text-base">
                  {item.question}
                </span>
                <span className="text-amber-400 font-bold text-lg shrink-0">
                  {openIndex === idx ? "−" : "+"}
                </span>
              </button>
              {openIndex === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-400 border-t border-zinc-800/60 pt-3 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
