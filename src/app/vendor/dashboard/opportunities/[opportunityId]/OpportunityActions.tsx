"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface OpportunityActionsProps {
  opportunityId: string;
}

export function OpportunityActions({ opportunityId }: OpportunityActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function respond(action: "INTERESTED" | "DECLINED") {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/opportunities/${opportunityId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      setSuccess(action === "INTERESTED" ? "Marked as interested." : "Response recorded.");
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
      {!success && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => respond("INTERESTED")}
            className="flex-1 rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
          >
            {submitting ? "Saving..." : <>I&apos;m Interested</>}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => respond("DECLINED")}
            className="flex-1 rounded-md bg-zinc-700 text-zinc-100 font-medium py-2 disabled:opacity-50"
          >
            {submitting ? "Saving..." : <>Can&apos;t Take This</>}
          </button>
        </div>
      )}
    </div>
  );
}
