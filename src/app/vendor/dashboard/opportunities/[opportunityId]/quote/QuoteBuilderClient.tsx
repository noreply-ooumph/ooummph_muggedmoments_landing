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
    <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 bg-zinc-900/70 backdrop-blur-md rounded-2xl border border-zinc-800/80 shadow-2xl text-zinc-100 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80 mb-6">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            Quote Studio
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {submitted ? "Submitted Quote" : "Build Your Quote"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Provide details, itemized pricing, and terms for this customer opportunity.
          </p>
        </div>
        <Link
          href={`/vendor/dashboard/opportunities/${opportunityId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-amber-400 transition-colors bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-2 hover:border-zinc-600"
        >
          ← Back to Details
        </Link>
      </div>

      {saved && !submitted && (
        <div className="mb-6 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Draft saved successfully.
        </div>
      )}

      {submitted && (
        <div className="mb-6 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Quote submitted (version {quote?.versionNumber}). This version can no longer be edited.
        </div>
      )}

      {submitted && canRevise && (
        <button
          type="button"
          onClick={startRevision}
          disabled={revising}
          className="w-full mb-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 font-medium py-3 text-sm transition-all disabled:opacity-50 shadow-md"
        >
          {revising ? "Starting revision..." : "✏️ Revise Quote"}
        </button>
      )}

      {error && (
        <div className="mb-6 text-sm text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-xl p-4">
          <p className="font-semibold">{error}</p>
          {reasons.length > 0 && (
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-rose-300">
              {reasons.map((reason) => (
                <li key={reason}>{REASON_MESSAGES[reason]}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Line Items Section */}
        <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/60">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-zinc-200">Line Items & Pricing</label>
            <span className="text-xs text-zinc-400">Specify itemized costs</span>
          </div>

          {lineItems.length > 0 && (
            <div className="mb-4 rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-900/40">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-800/50 px-4 py-3 border-b border-zinc-800/60">
                <span>Item Description</span>
                <span className="text-right">Amount (₹)</span>
                <span className="w-6" />
              </div>
              <div className="divide-y divide-zinc-800/50">
                {lineItems.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-sm px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                  >
                    <span className="text-zinc-200 font-medium truncate">{item.label}</span>
                    <span className="text-amber-400 font-semibold text-right whitespace-nowrap">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                    {!submitted ? (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-zinc-500 hover:text-rose-400 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-rose-500/10 transition-colors"
                        aria-label={`Remove ${item.label}`}
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="w-6" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!submitted && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setLineItemError(null);
                  }}
                  placeholder="Item name (e.g. Traditional Photography, Stage Decor)"
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                <input
                  type="number"
                  min={0}
                  value={newAmount}
                  onChange={(e) => {
                    setNewAmount(e.target.value);
                    setLineItemError(null);
                  }}
                  placeholder="Amount (₹)"
                  className="w-full sm:w-36 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={addLineItem}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 px-5 py-2.5 text-sm font-medium transition-all"
                >
                  + Add Item
                </button>
              </div>
              {lineItemError && (
                <p className="text-xs text-rose-400 mt-1 pl-1">{lineItemError}</p>
              )}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-sm text-zinc-400 font-medium">Calculated Quote Total</span>
            <span className="text-xl font-bold text-amber-400">₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Availability & Validity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/60">
            <label className="block text-sm font-semibold text-zinc-200 mb-2">
              Availability Status
            </label>
            <select
              value={availabilityState}
              onChange={(e) => setAvailabilityState(e.target.value as AvailabilityState)}
              disabled={submitted}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 disabled:opacity-60 transition-all"
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/60">
            <label className="block text-sm font-semibold text-zinc-200 mb-2">
              Valid Until Date
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              disabled={submitted}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 disabled:opacity-60 transition-all"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/60">
          <label className="block text-sm font-semibold text-zinc-200 mb-2">
            Quote Notes & Terms
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitted}
            rows={3}
            maxLength={2000}
            placeholder="Add payment terms, special instructions, or customization details..."
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 disabled:opacity-60 transition-all"
          />
        </div>

        {/* Included / Excluded Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/60">
            <label className="block text-sm font-semibold text-emerald-400 mb-3">
              ✓ Included Features
            </label>
            <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
              {included.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-emerald-300"
                >
                  {item}
                  {!submitted && (
                    <button
                      type="button"
                      onClick={() => setIncluded(included.filter((i) => i !== item))}
                      className="text-emerald-400/60 hover:text-emerald-300 ml-1"
                      aria-label={`Remove ${item}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
              {included.length === 0 && (
                <p className="text-xs text-zinc-500 italic">No included items added yet</p>
              )}
            </div>
            {!submitted && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIncluded}
                  onChange={(e) => setNewIncluded(e.target.value)}
                  placeholder="e.g. Raw footage included"
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                  type="button"
                  onClick={() => addTag(included, setIncluded, newIncluded, () => setNewIncluded(""))}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 text-xs font-medium border border-zinc-700"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/60">
            <label className="block text-sm font-semibold text-rose-400 mb-3">
              ✕ Excluded Features
            </label>
            <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
              {excluded.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-1.5 text-rose-300"
                >
                  {item}
                  {!submitted && (
                    <button
                      type="button"
                      onClick={() => setExcluded(excluded.filter((i) => i !== item))}
                      className="text-rose-400/60 hover:text-rose-300 ml-1"
                      aria-label={`Remove ${item}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
              {excluded.length === 0 && (
                <p className="text-xs text-zinc-500 italic">No excluded items added yet</p>
              )}
            </div>
            {!submitted && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExcluded}
                  onChange={(e) => setNewExcluded(e.target.value)}
                  placeholder="e.g. Travel costs extra"
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
                <button
                  type="button"
                  onClick={() => addTag(excluded, setExcluded, newExcluded, () => setNewExcluded(""))}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 text-xs font-medium border border-zinc-700"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!submitted && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={saveDraft}
              disabled={submitting}
              className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-3.5 border border-zinc-700/80 disabled:opacity-50 transition-all shadow-md"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={submitQuote}
              disabled={submitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold py-3.5 shadow-lg shadow-amber-500/10 disabled:opacity-50 transition-all"
            >
              Submit Official Quote
            </button>
          </div>
        )}

        {!submitted && canDiscard && (
          <div className="pt-2 text-center">
            {discardError && (
              <p className="text-xs text-rose-400 mb-2">{discardError}</p>
            )}
            <button
              type="button"
              onClick={discardDraft}
              disabled={discarding}
              className="text-xs text-zinc-400 hover:text-rose-400 underline transition-colors disabled:opacity-50"
            >
              {discarding ? "Discarding..." : "Discard this draft revision"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
