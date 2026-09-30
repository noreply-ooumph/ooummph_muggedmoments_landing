/**
 * MuggedMoments — Status Page Client (Stage 15, Discovery — minimal slice)
 *
 * Fulfils the promise already printed on the success page ("Keep this code to
 * reference your event request") — until now, nothing consumed that code afterward.
 *
 * Fetches GET /api/leads/[publicLeadId] and renders the same MatchList component used
 * immediately post-submission, so a returning visitor sees consistent information.
 */

"use client";

import React, { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { MatchList } from "@/components/matches/MatchList";
import { QuoteCard } from "@/components/quotes/QuoteCard";
import { QuoteComparisonTable } from "@/components/quotes/QuoteComparisonTable";
import { MessageThread } from "@/components/quotes/MessageThread";
import { BookingRequestFlow } from "@/components/booking/BookingRequestFlow";
import { ConfirmedBookingCard } from "@/components/booking/ConfirmedBookingCard";
import { BookingRecoveryBanner } from "@/components/booking/BookingRecoveryBanner";
import { EditLeadDetailsForm } from "./EditLeadDetailsForm";
import type { PublicVendorMatch, QualificationStatus } from "@/types";
import type { PublicQuote } from "@/domain/quote/publicQuoteService";
import type { PublicBookingRequest } from "@/domain/booking/publicBookingRequestService";
import type { PublicBooking } from "@/domain/booking/publicBookingService";

interface StatusData {
  publicLeadId: string;
  status: string;
  completenessStatus: "COMPLETE" | "INCOMPLETE" | "PENDING";
  city: string;
  locality: string | null;
  eventType: string;
  guestCount?: number;
  budget: string | null;
  services: string[];
  eventDate?: string;
  createdAt: string;
  qualificationStatus: QualificationStatus;
  missingFields: string[];
  matches: PublicVendorMatch[];
  quotes: PublicQuote[];
  bookingRequests: PublicBookingRequest[];
  bookings: PublicBooking[];
}

// Both bookingRequests and bookings are ordered oldest-first (see
// leadService.ts's shared query) because that's the correct order for other
// consumers (e.g. the Confirmed Booking count/list). For a per-vendor lookup
// we want the MOST RECENT entry for that vendor, not the first one in that
// order — a vendor can have more than one BookingRequest/Booking once
// rebooking after cancellation/rejection is possible (Stage 19, Phase 19.5).
function findLatestByVendor<T extends { vendorId: string; createdAt: string }>(
  items: T[],
  vendorId: string
): T | undefined {
  return items
    .filter((item) => item.vendorId === vendorId)
    .reduce<T | undefined>((latest, current) => {
      if (!latest || current.createdAt > latest.createdAt) return current;
      return latest;
    }, undefined);
}

export function StatusPageClient({ publicLeadId }: { publicLeadId: string }) {
  const [data, setData] = useState<StatusData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDetails, setEditingDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/leads/${publicLeadId}`)
      .then(async (res) => {
        if (cancelled) return;

        // 404 = valid format, no matching lead. 400 = malformed code (e.g. wrong
        // length/characters) — both mean "we don't recognize this reference," so both
        // get the same honest "not found" state rather than a generic server error.
        if (res.status === 404 || res.status === 400) {
          setNotFound(true);
          return;
        }

        if (!res.ok) {
          setError("We couldn't load your request right now. Please try again.");
          return;
        }

        const json = (await res.json()) as StatusData;
        setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setError("We couldn't load your request right now. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicLeadId]);

  // Stage 19, Phase 19.7.7 — the first mount-triggered analytics event in this
  // codebase (every prior event fires from a real click). Deliberately keyed
  // on publicLeadId, not on `data` itself, so a later refetchStatus() (after
  // sending a message, requesting a booking, etc.) does NOT re-fire this —
  // only a genuine new page load does. Known limitation: a quote that arrives
  // via a later refetch (customer opens the page before any quote exists, then
  // revisits) will not itself trigger a view event, since the effect only runs
  // once per publicLeadId — an acceptable narrowing for a first slice of this
  // event, not silently hidden.
  useEffect(() => {
    if (!data) return;
    for (const quote of data.quotes) {
      track("quote_viewed", { vendorId: quote.vendorId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.publicLeadId]);

  // Stage 18, Phase 18.5 — re-fetch the whole status payload after a message is sent,
  // rather than mutating local state, so the displayed thread never drifts from what
  // was actually persisted.
  async function refetchStatus() {
    try {
      const res = await fetch(`/api/leads/${publicLeadId}`);
      if (res.ok) {
        setData((await res.json()) as StatusData);
      }
    } catch {
      // A failed refetch after a successful send is not itself an error worth
      // surfacing — the message was sent; the customer just won't see it update
      // until their next reload.
    }
  }

  async function sendCustomerMessage(
    vendorId: string,
    body: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${publicLeadId}/quotes/${vendorId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json?.error?.message ?? "Could not send message." };
      }
      await refetchStatus();
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Please try again." };
    }
  }

  async function sendBookingRequest(
    vendorId: string,
    idempotencyKey: string,
    expectedVersionNumber: number
  ): Promise<{ ok: boolean; error?: string; errorCode?: string }> {
    try {
      const res = await fetch(`/api/leads/${publicLeadId}/quotes/${vendorId}/booking-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, expectedVersionNumber }),
      });
      const json = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: json?.error?.message ?? "Could not send booking request.",
          errorCode: json?.error?.code,
        };
      }
      await refetchStatus();
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Please try again." };
    }
  }

  async function cancelBooking(
    vendorId: string,
    note: string | undefined
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${publicLeadId}/quotes/${vendorId}/booking/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json?.error?.message ?? "Could not cancel booking." };
      }
      await refetchStatus();
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Please try again." };
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center text-zinc-400 text-sm">
        Loading your request...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-center">
        <p className="text-zinc-200 font-medium mb-1">Reference not found</p>
        <p className="text-zinc-400 text-sm">
          We couldn&apos;t find a request matching{" "}
          <span className="font-mono text-zinc-300">{publicLeadId}</span>. Double-check
          the code and try again.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-center">
        <p className="text-zinc-200 font-medium mb-1">Something went wrong</p>
        <p className="text-zinc-400 text-sm">
          {error ?? "We couldn't load your request right now. Please try again."}
        </p>
      </div>
    );
  }

  // Stage 19, Phase 19.7.4 — "My Booking" only once something is actually
  // booked; calling it that beforehand would be premature/dishonest.
  const hasConfirmedBooking = data.bookings.some((b) => b.status === "CONFIRMED");

  // Mirrors resumeLead()'s server-side gate (leadService.ts) so the customer isn't
  // invited into an edit the server will reject anyway — CLOSED/INVALID lifecycle,
  // or a booking already confirmed with a vendor (see that function's doc comment
  // for why a confirmed booking locks this out entirely).
  const canEditDetails =
    data.status !== "CLOSED" && data.status !== "INVALID" && !hasConfirmedBooking;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 text-zinc-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            {hasConfirmedBooking ? "My Booking" : "Your Event Request"}
          </h2>
          <p className="text-xs text-zinc-400">
            {data.city}
            {data.locality && `, ${data.locality}`}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {data.eventType}
            {data.eventDate && ` · ${new Date(data.eventDate).toLocaleDateString()}`}
            {data.guestCount && ` · ${data.guestCount} guests`}
          </p>
          {data.services.length > 0 && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Services: {data.services.join(", ")}
            </p>
          )}
          {canEditDetails && !editingDetails && (
            <button
              type="button"
              onClick={() => setEditingDetails(true)}
              className="mt-1 text-xs text-amber-400 underline hover:text-amber-300"
            >
              Edit details
            </button>
          )}
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            data.completenessStatus === "COMPLETE"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          {data.completenessStatus === "COMPLETE"
            ? "Complete Profile"
            : "Partial Profile"}
        </span>
      </div>

      <div className="bg-zinc-950/80 rounded-xl p-5 border border-zinc-800/80 mb-6">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Tracking Reference
        </span>
        <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
          {data.publicLeadId}
        </div>
      </div>

      {editingDetails && (
        <EditLeadDetailsForm
          publicLeadId={data.publicLeadId}
          eventDate={data.eventDate}
          guestCount={data.guestCount}
          budget={data.budget}
          locality={data.locality}
          services={data.services}
          hasMatches={data.matches.length > 0}
          onSaved={async () => {
            await refetchStatus();
            setEditingDetails(false);
          }}
          onCancel={() => setEditingDetails(false)}
        />
      )}

      <p className="text-xs text-zinc-500 mb-6">
        Matched to vendors active when you submitted this request on{" "}
        {new Date(data.createdAt).toLocaleDateString()}.
      </p>

      {(() => {
        // Stage 19, Phase 19.5 — data.bookings can now include CANCELLED
        // bookings (PublicBooking gained a status field once CANCELLED was
        // added). Only currently-CONFIRMED ones belong in this section.
        const confirmedBookings = data.bookings.filter((b) => b.status === "CONFIRMED");
        const hasCancelledBooking = data.bookings.some((b) => b.status === "CANCELLED");

        return (
          <>
            {confirmedBookings.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  {confirmedBookings.length} Confirmed Booking{confirmedBookings.length === 1 ? "" : "s"}
                </h3>
                {confirmedBookings.map((booking) => (
                  <ConfirmedBookingCard key={booking.vendorId} booking={booking} />
                ))}
              </div>
            )}

            {confirmedBookings.length === 0 &&
              (data.bookingRequests.some((br) => br.status === "REJECTED" || br.status === "EXPIRED") ||
                hasCancelledBooking) && <BookingRecoveryBanner />}
          </>
        );
      })()}

      {data.quotes.length > 0 && (
        <div className="space-y-3 mb-6" id="quotes-section">
          <QuoteComparisonTable quotes={data.quotes} />
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            {data.quotes.length} Quote{data.quotes.length === 1 ? "" : "s"} Received
          </h3>
          {data.quotes.map((quote) => (
            <div key={quote.vendorId} id={`vendor-${quote.vendorId}`}>
              <QuoteCard quote={quote} />
              <MessageThread
                messages={quote.messages}
                viewerSenderType="CUSTOMER"
                onSend={(body) => sendCustomerMessage(quote.vendorId, body)}
              />
              <BookingRequestFlow
                vendorId={quote.vendorId}
                vendorName={quote.vendorName}
                quoteTotal={quote.total}
                versionNumber={quote.versionNumber}
                eventType={data.eventType}
                eventDate={data.eventDate}
                city={data.city}
                guestCount={data.guestCount}
                services={quote.services}
                included={quote.included}
                excluded={quote.excluded}
                availabilityState={quote.availabilityState}
                bookingRequest={findLatestByVendor(data.bookingRequests, quote.vendorId)}
                booking={findLatestByVendor(data.bookings, quote.vendorId)}
                onRequest={sendBookingRequest}
                onCancel={cancelBooking}
                onRefresh={refetchStatus}
              />
            </div>
          ))}
        </div>
      )}

      <MatchList
        qualificationStatus={data.qualificationStatus}
        matches={data.matches}
      />
    </div>
  );
}
