"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REJECTION_REASONS, type RejectionReasonCode } from "@/domain/booking/bookingRequestService";

interface BookingRequestActionsProps {
  bookingRequestId: string;
}

export function BookingRequestActions({ bookingRequestId }: BookingRequestActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectionReasonCode | null>(null);
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/booking-requests/${bookingRequestId}/accept`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      setSuccess("Booking accepted.");
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReject() {
    if (!reason) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/booking-requests/${bookingRequestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: reason === "OTHER" ? note : undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      setSuccess("Booking rejected.");
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md p-3">
          {success}
        </div>
      )}

      {!rejecting && !success && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={accept}
            className="flex-1 rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Accept"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setRejecting(true)}
            className="flex-1 rounded-md bg-zinc-700 text-zinc-100 font-medium py-2 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {rejecting && !success && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">Why are you rejecting this booking?</p>
          <div className="space-y-2">
            {REJECTION_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="radio"
                  name="rejectionReason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
          {reason === "OTHER" && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Please explain..."
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
              rows={3}
            />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting || !reason || (reason === "OTHER" && !note.trim())}
              onClick={confirmReject}
              className="flex-1 rounded-md bg-red-800 text-red-50 font-medium py-2 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm Rejection"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setRejecting(false);
                setReason(null);
                setNote("");
                setError(null);
              }}
              className="flex-1 rounded-md bg-zinc-700 text-zinc-100 font-medium py-2 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
