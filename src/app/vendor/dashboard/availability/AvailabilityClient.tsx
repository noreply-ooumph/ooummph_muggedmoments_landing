/**
 * MuggedMoments — Vendor Self-Service Availability (client logic)
 *
 * Talks to /api/vendor/availability (GET/POST/DELETE) — see that route and
 * availabilityService.ts's setVendorAvailability()/clearVendorAvailability()
 * for the full behavior. A date with source "BOOKING_ACCEPTED" is rendered
 * read-only ("Booked" — no Clear action) since it represents a real,
 * already-confirmed commitment that this self-service surface must never
 * touch; only "VENDOR_SELF_REPORTED" dates are ever editable/clearable here.
 */

"use client";

import { useState } from "react";
import { Input, Select, Button } from "@/components/ui";

interface AvailabilityRow {
  date: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  source: string | null;
}

const STATUS_LABEL: Record<AvailabilityRow["status"], string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  UNKNOWN: "Unknown",
};

const STATUS_STYLE: Record<AvailabilityRow["status"], string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  UNAVAILABLE: "bg-red-500/10 text-red-400 border-red-500/30",
  UNKNOWN: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
};

export function AvailabilityClient({ initialDates }: { initialDates: AvailabilityRow[] }) {
  const [dates, setDates] = useState(initialDates);
  const [dateValue, setDateValue] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingClearDate, setPendingClearDate] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dateValue || !statusValue) {
      setError("Please select both a date and a status.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateValue, status: statusValue }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save availability.");
        return;
      }
      setDates((prev) => {
        const withoutDate = prev.filter((d) => d.date.slice(0, 10) !== dateValue);
        return [
          ...withoutDate,
          { date: json.date, status: json.status, source: "VENDOR_SELF_REPORTED" },
        ].sort((a, b) => a.date.localeCompare(b.date));
      });
      setDateValue("");
      setStatusValue("");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear(date: string) {
    setPendingClearDate(date);
    try {
      const res = await fetch("/api/vendor/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) return;
      setDates((prev) => prev.filter((d) => d.date !== date));
    } finally {
      setPendingClearDate(null);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <Input
          label="Date"
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />
        <Select
          label="Status"
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value)}
          options={[
            { value: "AVAILABLE", label: "Available" },
            { value: "UNAVAILABLE", label: "Unavailable" },
          ]}
        />
        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
            {error}
          </div>
        )}
        <Button type="submit" size="sm" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Save"}
        </Button>
      </form>

      {dates.length === 0 ? (
        <p className="text-xs text-zinc-500">No upcoming dates set yet.</p>
      ) : (
        <div className="space-y-2">
          {dates.map((row) => {
            const isBooked = row.source === "BOOKING_ACCEPTED";
            return (
              <div
                key={row.date}
                className="flex items-center justify-between bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/80 text-sm"
              >
                <span className="text-zinc-200">
                  {new Date(row.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLE[row.status]}`}
                  >
                    {isBooked ? "Booked" : STATUS_LABEL[row.status]}
                  </span>
                  {!isBooked && (
                    <button
                      type="button"
                      onClick={() => handleClear(row.date)}
                      disabled={pendingClearDate === row.date}
                      className="text-xs text-zinc-500 underline hover:text-zinc-300 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
