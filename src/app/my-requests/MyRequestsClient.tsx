/**
 * MuggedMoments — /my-requests client logic (Stage 20)
 *
 * Phone-only lookup, no verification step — an explicit, informed product
 * decision, not an oversight. See docs/customer-status-lookup-brief.md for the
 * tradeoff as presented to and confirmed by the operator.
 *
 * Fetches POST /api/leads/by-phone and renders each result as a summary card
 * linking into the existing, already-built /status/[publicLeadId] page for full
 * detail (quotes, messaging, booking flow) — this page never duplicates that.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";

interface LeadSummary {
  publicLeadId: string;
  eventType: string;
  city: string;
  eventDate: string | null;
  status: string;
  createdAt: string;
  matchCount: number;
  quoteCount: number;
}

const STATUS_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  SUBMITTED: { label: "Submitted", tone: "amber" },
  UNDER_REVIEW: { label: "Under Review", tone: "zinc" },
  MATCHED: { label: "Matched", tone: "emerald" },
  CLOSED: { label: "Closed", tone: "gray" },
  INVALID: { label: "Invalid", tone: "red" },
};

export function MyRequestsClient() {
  const [phone, setPhone] = useState("");
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setLeads(null);
    try {
      const res = await fetch("/api/leads/by-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      setLeads(json.leads);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <PublicSiteHeader />

      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-xl border border-zinc-800 mt-6">
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Check My Status</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Enter the phone number you used when submitting an event request.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Phone number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
                placeholder="+91 98765 43210"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
            >
              {submitting ? "Looking up..." : "Check Status"}
            </button>
          </form>

          {error && (
            <div className="mt-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {leads && leads.length === 0 && (
          <div className="w-full max-w-md mx-auto mt-4 p-4 text-sm text-zinc-500 text-center">
            We couldn&apos;t find any event requests for that number.
          </div>
        )}

        {leads && leads.length > 0 && (
          <div className="w-full max-w-md mx-auto mt-4 space-y-3">
            <p className="text-xs text-zinc-500">
              Each request was matched to vendors active on the day it was
              submitted — not updated later.
            </p>
            {leads.map((lead) => {
              const status = STATUS_BADGE[lead.status] ?? STATUS_BADGE.SUBMITTED;
              return (
                <Link
                  key={lead.publicLeadId}
                  href={`/status/${lead.publicLeadId}`}
                  className="block bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-zinc-100">{lead.eventType}</p>
                      <p className="text-xs text-zinc-500">{lead.city}</p>
                    </div>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </div>
                  <p className="text-xs text-zinc-400">
                    {lead.eventDate
                      ? new Date(lead.eventDate).toLocaleDateString()
                      : "Date not set"}
                    {" · "}
                    {lead.matchCount} vendor{lead.matchCount === 1 ? "" : "s"} matched
                    {" · "}
                    {lead.quoteCount} quote{lead.quoteCount === 1 ? "" : "s"} received
                  </p>
                  <p className="text-xs text-zinc-600 font-mono mt-1">{lead.publicLeadId}</p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
