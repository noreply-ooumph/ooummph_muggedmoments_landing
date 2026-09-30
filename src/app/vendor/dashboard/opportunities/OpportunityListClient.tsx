/**
 * MuggedMoments — Vendor Opportunities List (client half)
 *
 * Split out of page.tsx (Phase 2 of the vendor UX brief) so the filter tabs can be
 * interactive without a page reload. The server page still does the single Prisma
 * fetch — this component only filters the array it's already given, client-side, per
 * the brief's explicit instruction not to add pagination or a second API call for
 * this data volume.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";

export interface OpportunityListItem {
  id: string;
  status: string;
  expired: boolean;
  eventTypeName: string;
  city: string;
  services: string[];
}

// Exactly the 4 keys the original page.tsx STATUS_LABEL map had — any other status
// value (e.g. QUOTE_PENDING/QUOTE_SUBMITTED) falls back to SENT below, matching the
// original page's ?? STATUS_LABEL.SENT fallback behavior unchanged.
const STATUS_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  SENT: { label: "New", tone: "amber" },
  VIEWED: { label: "Viewed", tone: "zinc" },
  INTERESTED: { label: "Interested", tone: "emerald" },
  DECLINED: { label: "Declined", tone: "red" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SENT", label: "New" },
  { value: "VIEWED", label: "Viewed" },
  { value: "INTERESTED", label: "Interested" },
  { value: "DECLINED", label: "Declined" },
];

export function OpportunityListClient({ opportunities }: { opportunities: OpportunityListItem[] }) {
  const [filter, setFilter] = useState("ALL");

  const filtered =
    filter === "ALL" ? opportunities : opportunities.filter((opp) => opp.status === filter);

  return (
    <div>
      {/*
        Phase 5 fix: overflow-x-auto here genuinely scrolled (verified: 336px content
        in a 262px box at mobile width) but gave no hint it did — "Declined" was
        invisible off-screen. flex-wrap replaces it, same reasoning and fix as
        VendorDashboardShell.tsx's mobile nav.
      */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              filter === f.value
                ? "bg-amber-400 text-zinc-950 border-amber-400"
                : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {opportunities.length === 0 && <p className="text-sm text-zinc-500">No opportunities yet.</p>}

      {opportunities.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">No opportunities match this filter.</p>
      )}

      <div className="space-y-3">
        {filtered.map((opp) => {
          const status = STATUS_BADGE[opp.status] ?? STATUS_BADGE.SENT;
          return (
            <Link
              key={opp.id}
              href={`/vendor/dashboard/opportunities/${opp.id}`}
              className="block bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-zinc-100">{opp.eventTypeName}</p>
                  <p className="text-xs text-zinc-500">{opp.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge label={status.label} tone={status.tone} />
                  {opp.expired && <span className="text-xs text-zinc-600">Expired</span>}
                </div>
              </div>
              {opp.services.length > 0 && (
                <p className="text-xs text-zinc-400">{opp.services.join(", ")}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
