/**
 * MuggedMoments — Vendor Booking Requests List (client half)
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

export interface BookingRequestListItem {
  id: string;
  status: string;
  expired: boolean;
  eventTypeName: string;
  city: string;
  total: number;
}

// Exactly the 5 keys the original page.tsx STATUS_LABEL map had.
const STATUS_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  REQUESTED: { label: "New Request", tone: "amber" },
  UNDER_REVIEW: { label: "Under Review", tone: "zinc" },
  ACCEPTED: { label: "Accepted", tone: "emerald" },
  REJECTED: { label: "Rejected", tone: "red" },
  EXPIRED: { label: "Expired", tone: "gray" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "REQUESTED", label: "New Request" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

export function BookingRequestListClient({ bookingRequests }: { bookingRequests: BookingRequestListItem[] }) {
  const [filter, setFilter] = useState("ALL");

  const filtered =
    filter === "ALL" ? bookingRequests : bookingRequests.filter((br) => br.status === filter);

  return (
    <div>
      {/*
        Phase 5 fix: same overflow-x-auto affordance issue as
        OpportunityListClient.tsx and VendorDashboardShell.tsx's mobile nav —
        genuinely scrollable but no visual hint. flex-wrap replaces it.
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

      {bookingRequests.length === 0 && (
        <p className="text-sm text-zinc-500">No booking requests yet.</p>
      )}

      {bookingRequests.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">No booking requests match this filter.</p>
      )}

      <div className="space-y-3">
        {filtered.map((br) => {
          const status = STATUS_BADGE[br.status] ?? STATUS_BADGE.REQUESTED;
          return (
            <Link
              key={br.id}
              href={`/vendor/dashboard/booking-requests/${br.id}`}
              className="block bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-zinc-100">{br.eventTypeName}</p>
                  <p className="text-xs text-zinc-500">{br.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge label={status.label} tone={status.tone} />
                  {br.expired && <span className="text-xs text-zinc-600">Expired</span>}
                </div>
              </div>
              <p className="text-xs text-zinc-400">₹{br.total.toLocaleString("en-IN")}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
