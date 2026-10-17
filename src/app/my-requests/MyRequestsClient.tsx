/**
 * MuggedMoments — /my-requests client logic (Stage 20)
 *
 * Customer-facing "check my status" entry point.
 * Supports lookup by MM- reference code (BUG-002) as well as normalized phone number.
 *
 * Form labels and inputs properly associated via htmlFor/id (BUG-007).
 * Country code guidance provided for phone inputs (BUG-014).
 *
 * Fetches POST /api/leads/by-phone and renders each result as a summary card
 * linking into the existing /status/[publicLeadId] page for full detail.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { formatCityName, formatStandardDate } from "@/lib/format";

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

interface MeetingSummary {
  id: string;
  publicId: string;
  vendorId: string;
  vendorName: string;
  vendorCity: string;
  customerName: string;
  customerPhone: string;
  meetingDate: string;
  timeSlot: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  SUBMITTED: { label: "Submitted", tone: "amber" },
  UNDER_REVIEW: { label: "Under Review", tone: "zinc" },
  MATCHED: { label: "Matched", tone: "emerald" },
  CLOSED: { label: "Closed", tone: "gray" },
  INVALID: { label: "Invalid", tone: "red" },
};

const MEETING_STATUS_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: "Scheduled", tone: "amber" },
  CONFIRMED: { label: "Confirmed", tone: "emerald" },
  COMPLETED: { label: "Completed", tone: "zinc" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

export function MyRequestsClient() {
  const [lookupQuery, setLookupQuery] = useState("");
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Read URL query params on mount for direct tracking links (?ref=, ?code=, ?phone=)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialParam =
        params.get("ref") ||
        params.get("code") ||
        params.get("reference") ||
        params.get("phone") ||
        params.get("query");
      if (initialParam) {
        setLookupQuery(initialParam);
        void executeLookup(initialParam);
      }
    }
  }, []);

  async function executeLookup(rawInput: string) {
    const cleanQuery = rawInput.trim();
    if (!cleanQuery) return;

    setError(null);
    setSubmitting(true);
    setLeads(null);
    setMeetings(null);

    // Normalizes "MM-USGG9R1H", "mm-usgg9r1h", or raw 8-character "USGG9R1H"
    const stripped = cleanQuery.replace(/\s+/g, "");
    const refMatch = stripped.match(/^(?:MM-)?([A-Za-z0-9]{8})$/i);
    const referenceCode = refMatch ? `MM-${refMatch[1].toUpperCase()}` : null;

    try {
      if (referenceCode) {
        // Direct reference code lookup via /api/leads/[publicLeadId]
        const res = await fetch(`/api/leads/${encodeURIComponent(referenceCode)}`);
        if (res.status === 404) {
          setLeads([]);
          setMeetings([]);
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setError(data?.error?.message ?? "Something went wrong.");
          return;
        }

        setLeads([
          {
            publicLeadId: data.publicLeadId,
            eventType: data.eventType,
            city: data.city,
            eventDate: data.eventDate ?? null,
            status: data.status,
            createdAt: data.createdAt,
            matchCount: data.matches?.length ?? 0,
            quoteCount: data.quotes?.length ?? 0,
          },
        ]);
        setMeetings([]);
      } else {
        // Phone lookup via both leads and meetings
        const [leadsRes, meetingsRes] = await Promise.all([
          fetch("/api/leads/by-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: cleanQuery }),
          }),
          fetch("/api/meetings/by-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: cleanQuery }),
          }),
        ]);

        const leadsJson = await leadsRes.json();
        const meetingsJson = await meetingsRes.json();

        if (!leadsRes.ok && !meetingsRes.ok) {
          setError(
            leadsJson?.error?.message ??
              "Please enter a valid phone number or MM- reference code."
          );
          return;
        }

        setLeads(leadsJson?.leads ?? []);
        setMeetings(meetingsJson?.meetings ?? []);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await executeLookup(lookupQuery);
  }

  const hasNoResults =
    leads !== null && meetings !== null && leads.length === 0 && meetings.length === 0;

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <PublicSiteHeader />

      <main className="flex-1 flex flex-col items-center p-4 sm:p-6">
        <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl mt-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-2">Check My Status</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Enter the phone number or MM- tracking reference code from your event request or meeting booking.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="status-lookup-input"
                className="block text-xs uppercase font-bold text-zinc-400 mb-1.5 tracking-wider"
              >
                Phone Number or Reference Code
              </label>
              <div className="relative">
                <input
                  id="status-lookup-input"
                  type="text"
                  required
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
                  placeholder="+91 98765 43210 or MM-XXXXXXXX"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Indian numbers (+91) or your 11-character MM-XXXXXXXX tracking reference code
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || !lookupQuery.trim()}
              className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold py-3 transition-all shadow-md shadow-amber-400/10 disabled:opacity-50 text-sm"
            >
              {submitting ? "Looking up..." : "Check Status →"}
            </button>
          </form>

          {error && (
            <div className="mt-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-xl p-3">
              {error}
            </div>
          )}
        </div>

        {hasNoResults && (
          <div className="w-full max-w-lg mx-auto mt-6 p-4 text-sm text-zinc-400 text-center bg-zinc-900/60 rounded-xl border border-zinc-800">
            We couldn&apos;t find any event requests or scheduled meetings matching that entry.
          </div>
        )}

        {/* Scheduled Meetings Section */}
        {meetings && meetings.length > 0 && (
          <div className="w-full max-w-lg mx-auto mt-8 space-y-4">
            <h2 className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-2">
              <span>📅</span> Your Scheduled Vendor Meetings ({meetings.length})
            </h2>
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const badge = MEETING_STATUS_BADGE[meeting.status] ?? MEETING_STATUS_BADGE.SCHEDULED;
                return (
                  <div
                    key={meeting.id}
                    className="bg-zinc-900/90 backdrop-blur-md rounded-2xl p-5 border border-zinc-800 shadow-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-zinc-100 text-base">{meeting.vendorName}</h3>
                        <p className="text-xs text-zinc-400">{formatCityName(meeting.vendorCity)}</p>
                      </div>
                      <StatusBadge label={badge.label} tone={badge.tone} />
                    </div>

                    <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-850 text-xs space-y-1 text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Date & Time:</span>
                        <span className="font-semibold text-amber-400">
                          {formatStandardDate(meeting.meetingDate)} at {meeting.timeSlot}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Host Name:</span>
                        <span>{meeting.customerName}</span>
                      </div>
                      {meeting.notes && (
                        <div className="pt-1 border-t border-zinc-800/60 text-zinc-400 italic">
                          &quot;{meeting.notes}&quot;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                      <Link
                        href={`/vendors/${meeting.vendorId}`}
                        className="text-amber-400 hover:underline font-semibold"
                      >
                        View Vendor Profile →
                      </Link>
                      <span className="font-mono">{meeting.publicId.slice(0, 13)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event Requests Section */}
        {leads && leads.length > 0 && (
          <div className="w-full max-w-lg mx-auto mt-8 space-y-4">
            <h2 className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-2">
              <span>📋</span> Your Matching Requests ({leads.length})
            </h2>
            <div className="space-y-3">
              {leads.map((lead) => {
                const status = STATUS_BADGE[lead.status] ?? STATUS_BADGE.SUBMITTED;
                return (
                  <Link
                    key={lead.publicLeadId}
                    href={`/status/${lead.publicLeadId}`}
                    className="block bg-zinc-900/90 backdrop-blur-md rounded-2xl p-5 border border-zinc-800 hover:border-amber-500/40 transition-all shadow-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-zinc-100 text-base">{lead.eventType}</p>
                        <p className="text-xs text-zinc-400">{formatCityName(lead.city)}</p>
                      </div>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </div>
                    <p className="text-xs text-zinc-400">
                      {lead.eventDate
                        ? formatStandardDate(lead.eventDate)
                        : "Date not set"}
                      {" · "}
                      {lead.matchCount} vendor{lead.matchCount === 1 ? "" : "s"} matched
                      {" · "}
                      {lead.quoteCount} quote{lead.quoteCount === 1 ? "" : "s"} received
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                      <span className="text-amber-400 font-semibold">View Full Details →</span>
                      <span className="font-mono">{lead.publicLeadId}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
