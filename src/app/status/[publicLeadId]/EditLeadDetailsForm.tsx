/**
 * MuggedMoments — Edit Event Request Details (post-match)
 *
 * Lets a returning customer correct their event date, guest count, budget, or
 * locality after their request has already been matched to vendors —
 * previously there was no way to do this at all once past the initial
 * submission/resume flow.
 *
 * Deliberately does NOT allow editing city, event type, or services: those are
 * matching dimensions (see matchingService.ts's evaluateCompatibility()) —
 * changing them post-match would silently invalidate the vendors already
 * matched below without anything re-running matching to correct for it. The
 * server (resumeLead() in leadService.ts) enforces this same restriction
 * independently — this form only mirrors it so the customer isn't invited into
 * an edit the server will reject anyway. locality is safe to include here
 * precisely because it is NOT a matching dimension — informational only.
 *
 * Reuses PATCH /api/leads/[publicLeadId] — the same endpoint the Stage 9
 * "Continue" (resume-incomplete-lead) flow already uses. That route's schema
 * already accepts this exact field set; only the domain-layer authorization
 * check changed to allow it outside the INCOMPLETE case too.
 */

"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";

interface EditLeadDetailsFormProps {
  publicLeadId: string;
  eventDate?: string;
  guestCount?: number;
  budget: string | null;
  locality: string | null;
  services: string[];
  hasMatches: boolean;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function EditLeadDetailsForm({
  publicLeadId,
  eventDate,
  guestCount,
  budget,
  locality,
  services,
  hasMatches,
  onSaved,
  onCancel,
}: EditLeadDetailsFormProps) {
  const [eventDateValue, setEventDateValue] = useState(toDateInputValue(eventDate));
  const [guestCountValue, setGuestCountValue] = useState(guestCount?.toString() ?? "");
  const [budgetValue, setBudgetValue] = useState(budget ?? "");
  const [localityValue, setLocalityValue] = useState(locality ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${publicLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: eventDateValue || undefined,
          guestCount: guestCountValue ? parseInt(guestCountValue, 10) : undefined,
          budget: budgetValue || undefined,
          locality: localityValue || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFieldErrors(json?.error?.fields ?? {});
        setError(json?.error?.message ?? "Could not save your changes.");
        return;
      }
      await onSaved();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-950/80 rounded-xl p-5 border border-zinc-800/80 mb-6 space-y-4"
    >
      <p className="text-sm font-semibold text-zinc-200">Edit your request</p>

      <Input
        label="Event Date"
        type="date"
        value={eventDateValue}
        onChange={(e) => setEventDateValue(e.target.value)}
        error={fieldErrors.eventDate}
      />
      <Input
        label="Guest Count"
        type="number"
        min={1}
        value={guestCountValue}
        onChange={(e) => setGuestCountValue(e.target.value)}
        error={fieldErrors.guestCount}
      />
      <Input
        label="Approximate Budget"
        type="text"
        placeholder="e.g. ₹5,00,000"
        value={budgetValue}
        onChange={(e) => setBudgetValue(e.target.value)}
        error={fieldErrors.budget}
      />
      <Input
        label="Locality / Area (optional)"
        type="text"
        placeholder="e.g. Andheri West"
        value={localityValue}
        onChange={(e) => setLocalityValue(e.target.value)}
        error={fieldErrors.locality}
      />

      {services.length > 0 && (
        <div>
          <span className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
            Services Requested
          </span>
          <p className="text-sm text-zinc-400">{services.join(", ")}</p>
        </div>
      )}

      {hasMatches && (
        <p className="text-xs text-zinc-500">
          City, event type, and services can&apos;t be changed here since vendors have
          already been matched against them — changing your event date is fine though:
          vendor availability shown below is re-checked against your current date each
          time you view this page.
        </p>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting} size="sm">
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-xs text-zinc-400 underline hover:text-zinc-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
