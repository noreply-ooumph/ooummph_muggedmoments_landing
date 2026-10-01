/**
 * MuggedMoments — VendorMeetingsClient
 *
 * Interactive vendor-side management component for updating consultation
 * meeting statuses (Confirm, Mark Complete, Cancel) in real-time.
 */

"use client";

import React, { useState } from "react";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";

interface Meeting {
  id: string;
  publicId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  meetingDate: string;
  timeSlot: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface VendorMeetingsClientProps {
  initialMeetings: Meeting[];
}

const STATUS_BADGES: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: "Scheduled", tone: "amber" },
  CONFIRMED: { label: "Confirmed", tone: "emerald" },
  COMPLETED: { label: "Completed", tone: "zinc" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

export function VendorMeetingsClient({ initialMeetings }: VendorMeetingsClientProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(meetingId: string, newStatus: string) {
    setUpdatingId(meetingId);
    setError(null);

    try {
      const res = await fetch(`/api/vendor/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to update meeting status.");
        return;
      }

      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, status: newStatus } : m))
      );
    } catch {
      setError("Network error. Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (meetings.length === 0) {
    return (
      <div className="p-8 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 text-center text-zinc-400">
        <p className="text-base font-semibold text-zinc-300 mb-1">No Meetings Scheduled Yet</p>
        <p className="text-xs">When customers book a meeting from your public profile, they will appear here live.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-900 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {meetings.map((meeting) => {
          const badge = STATUS_BADGES[meeting.status] ?? STATUS_BADGES.SCHEDULED;
          const isUpdating = updatingId === meeting.id;

          return (
            <div
              key={meeting.id}
              className="p-6 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-white">{meeting.customerName}</h3>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    📞 <a href={`tel:${meeting.customerPhone}`} className="hover:text-amber-400">{meeting.customerPhone}</a>
                    {meeting.customerEmail && ` · ✉️ ${meeting.customerEmail}`}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 shrink-0">
                  <div className="text-xs text-zinc-400">Requested Slot</div>
                  <div className="text-sm font-extrabold text-amber-400">
                    {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {meeting.timeSlot}
                  </div>
                </div>
              </div>

              {meeting.notes && (
                <div className="text-xs bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 text-zinc-300 italic">
                  &quot;{meeting.notes}&quot;
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-[11px] font-mono text-zinc-500">ID: {meeting.publicId.slice(0, 13)}</span>

                <div className="flex items-center gap-2">
                  {meeting.status === "SCHEDULED" && (
                    <button
                      onClick={() => updateStatus(meeting.id, "CONFIRMED")}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "✓ Confirm Meeting"}
                    </button>
                  )}

                  {meeting.status === "CONFIRMED" && (
                    <button
                      onClick={() => updateStatus(meeting.id, "COMPLETED")}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "Mark Completed"}
                    </button>
                  )}

                  {meeting.status !== "CANCELLED" && meeting.status !== "COMPLETED" && (
                    <button
                      onClick={() => updateStatus(meeting.id, "CANCELLED")}
                      disabled={isUpdating}
                      className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-red-400 font-semibold text-xs rounded-xl transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
