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

  const countByFilter = (value: string) => {
    if (value === "ALL") return opportunities.length;
    return opportunities.filter((opp) => opp.status === value).length;
  };

  const filtered =
    filter === "ALL" ? opportunities : opportunities.filter((opp) => opp.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = countByFilter(f.value);
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 ${
                active
                  ? "bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-400/10 font-bold"
                  : "bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                  active
                    ? "bg-zinc-950/20 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {opportunities.length === 0 && (
        <div className="p-8 text-center bg-zinc-950/50 rounded-xl border border-zinc-800/80">
          <p className="text-zinc-400 text-sm font-medium">No opportunities received yet.</p>
          <p className="text-zinc-500 text-xs mt-1">
            New client requests matching your profile will appear here automatically.
          </p>
        </div>
      )}

      {opportunities.length > 0 && filtered.length === 0 && (
        <div className="p-8 text-center bg-zinc-950/50 rounded-xl border border-zinc-800/80">
          <p className="text-zinc-400 text-sm font-medium">No opportunities match this filter.</p>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className="mt-2 text-xs text-amber-400 hover:underline font-semibold"
          >
            Clear filter →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((opp) => {
          const status = STATUS_BADGE[opp.status] ?? STATUS_BADGE.SENT;
          return (
            <Link
              key={opp.id}
              href={`/vendor/dashboard/opportunities/${opp.id}`}
              className="group block bg-zinc-950/70 hover:bg-zinc-900/90 rounded-2xl p-5 border border-zinc-800/90 hover:border-amber-500/40 transition-all duration-200 shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-amber-300 transition-colors text-base">
                      {opp.eventTypeName}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <span>📍</span> {opp.city}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge label={status.label} tone={status.tone} />
                    {opp.expired && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-800/80 text-zinc-500 border border-zinc-700/60">
                        Expired
                      </span>
                    )}
                  </div>
                </div>

                {opp.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-900">
                    {opp.services.map((svc) => (
                      <span
                        key={svc}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                <span>View Request Details</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
