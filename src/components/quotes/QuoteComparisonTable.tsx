/**
 * MuggedMoments — Quote Comparison Table (Stage 18, Phase 18.3)
 *
 * A quick scan-and-compare view above the per-vendor QuoteCard list in
 * StatusPageClient.tsx. Renders nothing when there are fewer than 2 submitted
 * quotes — comparing one quote against nothing is not a comparison. Directly
 * mirrors MatchComparisonTable.tsx's structure and rules (Stage 16, Phase 5).
 *
 * CRITICAL: same standing rules as every comparison view in this app — natural
 * array (submission) order only, no sorting/highlighting by price or any other
 * "quality" signal, no BEST/CHEAPEST/RECOMMENDED labeling. A price column is a
 * fact being displayed, not a ranking.
 */

"use client";

import React from "react";
import type { PublicQuote } from "@/domain/quote/publicQuoteService";
import { AVAILABILITY_LABEL } from "./QuoteCard";

interface QuoteComparisonTableProps {
  quotes: PublicQuote[];
}

export function QuoteComparisonTable({ quotes }: QuoteComparisonTableProps) {
  if (quotes.length < 2) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
        Compare Quotes
      </h3>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm bg-zinc-950/80">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-4 py-2 font-medium">City</th>
              <th className="px-4 py-2 font-medium">Services</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Availability</th>
              <th className="px-4 py-2 font-medium">Valid Until</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote, index) => (
              <tr
                key={`${quote.vendorId}-${index}`}
                className="text-zinc-100 border-b border-zinc-800/60 last:border-b-0"
              >
                <td className="px-4 py-2">{quote.vendorName}</td>
                <td className="px-4 py-2 text-zinc-400">{quote.city}</td>
                <td className="px-4 py-2 text-zinc-400">{quote.services.join(", ")}</td>
                <td className="px-4 py-2 text-zinc-400">₹{quote.total}</td>
                <td className="px-4 py-2 text-zinc-400">
                  {AVAILABILITY_LABEL[quote.availabilityState]}
                </td>
                <td className="px-4 py-2 text-zinc-400">
                  {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
