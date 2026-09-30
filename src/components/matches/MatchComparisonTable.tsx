/**
 * MuggedMoments — Match Comparison Table (Stage 16, Phase 5)
 *
 * A quick scan-and-compare view above the per-vendor cards in MatchList.tsx. Renders
 * nothing when there are fewer than 2 matches — comparing one vendor against nothing
 * is not a comparison.
 *
 * CRITICAL: same standing rules as MatchList.tsx — natural array order only, no
 * sorting/highlighting by price or any other "quality" signal, no BEST/CHEAPEST/
 * RECOMMENDED labeling. A price column is a fact being displayed, not a ranking.
 */

"use client";

import React from "react";
import type { PublicVendorMatch } from "@/types";
import { AVAILABILITY_LABEL } from "./MatchList";

interface MatchComparisonTableProps {
  matches: PublicVendorMatch[];
}

export function MatchComparisonTable({ matches }: MatchComparisonTableProps) {
  if (matches.length < 2) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
        Compare Vendors
      </h3>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm bg-zinc-950/80">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-4 py-2 font-medium">City</th>
              <th className="px-4 py-2 font-medium">Services</th>
              <th className="px-4 py-2 font-medium">Starting Price</th>
              <th className="px-4 py-2 font-medium">Availability</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <tr
                key={`${match.vendorId}-${index}`}
                className="text-zinc-100 border-b border-zinc-800/60 last:border-b-0"
              >
                <td className="px-4 py-2">{match.vendorName}</td>
                <td className="px-4 py-2 text-zinc-400">{match.city}</td>
                <td className="px-4 py-2 text-zinc-400">{match.services.join(", ")}</td>
                <td className="px-4 py-2 text-zinc-400">
                  {match.startingPrice !== null ? `₹${match.startingPrice}` : "—"}
                </td>
                <td className="px-4 py-2 text-zinc-400">
                  {AVAILABILITY_LABEL[match.availability]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
