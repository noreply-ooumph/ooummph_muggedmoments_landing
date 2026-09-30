"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateTotal } from "@/domain/quote/quoteService";
import type { QuoteValidationFailureReason } from "@/domain/quote/quoteService";

type AvailabilityState = "AVAILABLE" | "PENDING_CONFIRMATION" | "UNAVAILABLE" | "UNKNOWN";

interface LineItem {
  label: string;
  amount: number;
}

interface QuoteBuilderClientProps {
  opportunityId: string;
  // True once the current version is SUBMITTED and no revision is in progress —
  // Stage 18, Phase 18.4.
  canRevise: boolean;
  // True while a revision is in progress AND a prior submitted version exists to
  // fall back to — lets the vendor back out of a revision they started, rather
  // than being forced to submit it. Never true for a first-ever, never-submitted
  // draft (see the DELETE route's doc comment).
  canDiscard: boolean;
  quote: {
    status: "DRAFT" | "SUBMITTED";
    versionNumber: number;
    availabilityState: AvailabilityState;
    validUntil: string | null;
    notes: string | null;
    included: string[];
    excluded: string[];
    lineItems: LineItem[];
  } | null;
}

const AVAILABILITY_OPTIONS: { value: AvailabilityState; label: string }[] = [
  { value: "UNKNOWN", label: "Not yet confirmed" },
  { value: "AVAILABLE", label: "Available" },
  { value: "PENDING_CONFIRMATION", label: "Pending confirmation" },
  { value: "UNAVAILABLE", label: "Unavailable" },
];

const REASON_MESSAGES: Record<QuoteValidationFailureReason, string> = {
  NO_LINE_ITEMS: "Add at least one line item before submitting.",
  INVALID_LINE_ITEM_AMOUNT: "Every line item needs a valid, non-negative whole-number amount.",
  AVAILABILITY_NOT_SET: "Please confirm your availability for this quote.",
  VALID_UNTIL_MISSING: "Please set a date this quote is valid until.",
  VALID_UNTIL_IN_PAST: "The valid-until date must be in the future.",
};

function dateToInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function QuoteBuilderClient({ opportunityId, canRevise, canDiscard, quote }: QuoteBuilderClientProps) {
  const router = useRouter();
  const readOnly = quote?.status === "SUBMITTED";
  const [revising, setRevising] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<LineItem[]>(quote?.lineItems ?? []);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>(
    quote?.availabilityState ?? "UNKNOWN"
  );
  const [validUntil, setValidUntil] = useState(dateToInputValue(quote?.validUntil ?? null));
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [included, setIncluded] = useState<string[]>(quote?.included ?? []);
  const [excluded, setExcluded] = useState<string[]>(quote?.excluded ?? []);
  const [newIncluded, setNewIncluded] = useState("");
  const [newExcluded, setNewExcluded] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<QuoteValidationFailureReason[]>([]);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(readOnly);
  const [submitting, setSubmitting] = useState(false);
  const [lineItemError, setLineItemError] = useState<string | null>(null);

  function addLineItem() {
    const amount = Number(newAmount);
    if (!newLabel.trim()) {
      setLineItemError("Enter an item name.");
      return;
    }
    if (newAmount.trim() === "" || !Number.isInteger(amount) || amount < 0) {
      setLineItemError("Enter a valid, non-negative whole-number amount.");
      return;
    }
    setLineItemError(null);
    setLineItems([...lineItems, { label: newLabel.trim(), amount }]);
    setNewLabel("");
    setNewAmount("");
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function addTag(list: string[], setList: (v: string[]) => void, value: string, clear: () => void) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    clear();
  }

  async function saveDraft() {
    setError(null);
    setReasons([]);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/opportunities/${opportunityId}/quote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems,
          availabilityState,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          notes,
          included,
          excluded,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save draft.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitQuote() {
    setError(null);
    setReasons([]);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/opportunities/${opportunityId}/quote/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error?.reasons) {
          setReasons(json.error.reasons);
        }
        setError(json?.error?.message ?? "Could not submit quote.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startRevision() {
    setError(null);
    setRevising(true);
    try {
      const res = await fetch(`/api/vendor/opportunities/${opportunityId}/quote/revise`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not start a revision.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setRevising(false);
    }
  }

  async function discardDraft() {
    setDiscardError(null);
    setDiscarding(true);
    try {
      const res = await fetch(`/api/vendor/opportunities/${opportunityId}/quote`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setDiscardError(json?.error?.message ?? "Could not discard this revision.");
        return;
      }
      router.refresh();
    } catch {
      setDiscardError("Could not reach the server. Please try again.");
    } finally {
      setDiscarding(false);
    }
  }

  const total = calculateTotal(lineItems);

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">
          {submitted ? "Submitted Quote" : "Build Your Quote"}
        </h1>
        <Link
          href={`/vendor/dashboard/opportunities/${opportunityId}`}
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          Back
        </Link>
      </div>

      {saved && !submitted && (
        <div className="mb-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md p-3">
          Draft saved.
        </div>
      )}

      {submitted && (
        <div className="mb-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md p-3">
          Quote submitted (version {quote?.versionNumber}). This version can no longer be edited.
        </div>
      )}

      {submitted && canRevise && (
        <button
          type="button"
          onClick={startRevision}
          disabled={revising}
          className="w-full mb-4 rounded-md bg-zinc-700 text-zinc-100 font-medium py-2 disabled:opacity-50"
        >
          {revising ? "Starting revision..." : "Revise Quote"}
        </button>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
          {error}
          {reasons.length > 0 && (
            <ul className="list-disc list-inside mt-2">
              {reasons.map((reason) => (
                <li key={reason}>{REASON_MESSAGES[reason]}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Line items</label>

          {lineItems.length > 0 && (
            <div className="mb-2 rounded-md border border-zinc-700 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide bg-zinc-800/60 px-3 py-2">
                <span>Item</span>
                <span className="text-right">Amount</span>
                <span className="w-4" />
              </div>
              {lineItems.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm bg-zinc-800/30 border-t border-zinc-700 px-3 py-2"
                >
                  <span className="text-zinc-200 truncate">{item.label}</span>
                  <span className="text-zinc-300 text-right whitespace-nowrap">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                  {!submitted ? (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-zinc-500 hover:text-zinc-300 w-4"
                      aria-label={`Remove ${item.label}`}
                    >
                      ×
                    </button>
                  ) : (
                    <span className="w-4" />
                  )}
                </div>
              ))}
            </div>
          )}

          {!submitted && (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setLineItemError(null);
                  }}
                  placeholder="Item (e.g. Decoration)"
                  className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
                />
                <input
                  type="number"
                  min={0}
                  value={newAmount}
                  onChange={(e) => {
                    setNewAmount(e.target.value);
                    setLineItemError(null);
                  }}
                  placeholder="Amount"
                  className="w-28 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
                />
                <button
                  type="button"
                  onClick={addLineItem}
                  className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm"
                >
                  Add
                </button>
              </div>
              {lineItemError && (
                <p className="text-xs text-red-400 mt-1">{lineItemError}</p>
              )}
            </>
          )}
          <p className="text-sm text-zinc-300 mt-2">Total: ₹{total.toLocaleString("en-IN")}</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Availability for this quote</label>
          <select
            value={availabilityState}
            onChange={(e) => setAvailabilityState(e.target.value as AvailabilityState)}
            disabled={submitted}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 disabled:opacity-60"
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Valid until</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={submitted}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitted}
            rows={3}
            maxLength={2000}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Included</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {included.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200"
              >
                {item}
                {!submitted && (
                  <button
                    type="button"
                    onClick={() => setIncluded(included.filter((i) => i !== item))}
                    className="text-zinc-500 hover:text-zinc-300"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {!submitted && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newIncluded}
                onChange={(e) => setNewIncluded(e.target.value)}
                className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
                placeholder="Add an included item"
              />
              <button
                type="button"
                onClick={() => addTag(included, setIncluded, newIncluded, () => setNewIncluded(""))}
                className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm"
              >
                Add
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Not included</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {excluded.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200"
              >
                {item}
                {!submitted && (
                  <button
                    type="button"
                    onClick={() => setExcluded(excluded.filter((i) => i !== item))}
                    className="text-zinc-500 hover:text-zinc-300"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {!submitted && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newExcluded}
                onChange={(e) => setNewExcluded(e.target.value)}
                className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
                placeholder="Add a not-included item"
              />
              <button
                type="button"
                onClick={() => addTag(excluded, setExcluded, newExcluded, () => setNewExcluded(""))}
                className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {!submitted && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={submitting}
              className="flex-1 rounded-md bg-zinc-700 text-zinc-100 font-medium py-2 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={submitQuote}
              disabled={submitting}
              className="flex-1 rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
            >
              Submit Quote
            </button>
          </div>
        )}

        {!submitted && canDiscard && (
          <div className="pt-2">
            {discardError && (
              <p className="text-xs text-red-400 mb-2">{discardError}</p>
            )}
            <button
              type="button"
              onClick={discardDraft}
              disabled={discarding}
              className="w-full text-sm text-zinc-500 underline hover:text-zinc-300 disabled:opacity-50"
            >
              {discarding ? "Discarding..." : "Discard this revision"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
