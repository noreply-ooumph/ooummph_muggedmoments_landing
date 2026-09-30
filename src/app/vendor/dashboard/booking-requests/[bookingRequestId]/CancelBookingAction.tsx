"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CancelBookingActionProps {
  bookingRequestId: string;
}

export function CancelBookingAction({ bookingRequestId }: CancelBookingActionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);

  async function confirmCancel() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/booking-requests/${bookingRequestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3">
      {error && (
        <div className="mb-3 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md p-3">
          Booking cancelled.
        </div>
      )}

      {!cancelling && !success && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => setCancelling(true)}
          className="rounded-md bg-zinc-700 text-zinc-100 font-medium py-2 px-3 text-sm disabled:opacity-50"
        >
          Cancel Booking
        </button>
      )}

      {cancelling && !success && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">Cancel this confirmed booking?</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Optional note..."
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={confirmCancel}
              className="flex-1 rounded-md bg-red-800 text-red-50 font-medium py-2 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm Cancellation"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setCancelling(false);
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
