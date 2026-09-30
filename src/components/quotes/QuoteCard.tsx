/**
 * MuggedMoments — Quote Card (Stage 18, Phase 18.2)
 *
 * Renders one submitted quote on the customer's status page. Read-only display only —
 * no accept/reject/comment actions here (that's a later phase).
 *
 * Uses its own availability label/style maps rather than MatchList.tsx's — a quote's
 * availability is the 4-state QuoteAvailabilityState (adds PENDING_CONFIRMATION),
 * distinct from the 3-state AvailabilityStatus used for lead-matching.
 */

import type { PublicQuote } from "@/domain/quote/publicQuoteService";

export const AVAILABILITY_LABEL: Record<PublicQuote["availabilityState"], string> = {
  AVAILABLE: "Available",
  PENDING_CONFIRMATION: "Pending confirmation",
  UNAVAILABLE: "Unavailable",
  UNKNOWN: "Not confirmed",
};

const AVAILABILITY_STYLE: Record<PublicQuote["availabilityState"], string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  PENDING_CONFIRMATION: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  UNAVAILABLE: "bg-red-500/10 text-red-400 border-red-500/30",
  UNKNOWN: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
};

export function QuoteCard({ quote }: { quote: PublicQuote }) {
  return (
    <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-medium text-zinc-100">{quote.vendorName}</p>
          <p className="text-xs text-zinc-500">{quote.city}</p>
          {quote.versionNumber > 1 && (
            <p className="text-xs text-zinc-600">Version {quote.versionNumber}</p>
          )}
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${AVAILABILITY_STYLE[quote.availabilityState]}`}
        >
          {AVAILABILITY_LABEL[quote.availabilityState]}
        </span>
      </div>

      {quote.services.length > 0 && (
        <p className="text-xs text-zinc-400 mb-2">{quote.services.join(", ")}</p>
      )}

      <p className="text-lg font-semibold text-zinc-100 mb-1">₹{quote.total}</p>

      {quote.validUntil && (
        <p className="text-xs text-zinc-500 mb-2">
          Valid until {new Date(quote.validUntil).toLocaleDateString()}
        </p>
      )}

      {quote.included.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-zinc-400 mb-1">Included</p>
          <ul className="text-xs text-zinc-300 list-disc list-inside">
            {quote.included.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {quote.excluded.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-1">Not included</p>
          <ul className="text-xs text-zinc-300 list-disc list-inside">
            {quote.excluded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
