/**
 * MuggedMoments — Booking Request Flow (Stage 19, Phase 19.0)
 *
 * Client component rendered inside each QuoteCard on the customer status page,
 * alongside (not replacing) MessageThread. Three states:
 *  - idle: "Request Booking" button
 *  - review: inline review block (quote total, vendor name) with a confirm button
 *  - submitting -> waiting/declined: shows the resulting booking request status
 *
 * Idempotency key is generated client-side once per submission attempt and held
 * in component state so a retried click (e.g. after a network blip) replays the
 * same key rather than creating a duplicate request.
 *
 * Stage 19, Phase 19.5 — also receives the matching PublicBooking (if any) and
 * hosts the cancel action. Once a booking is cancelled it's filtered out of the
 * top Confirmed Booking section (see StatusPageClient.tsx), so this per-vendor
 * card becomes the only remaining place that vendor's outcome — including its
 * timeline — stays visible to the customer.
 */

"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import type { PublicBookingRequest } from "@/domain/booking/publicBookingRequestService";
import type { PublicBooking } from "@/domain/booking/publicBookingService";
import type { PublicQuote } from "@/domain/quote/publicQuoteService";
import { BookingTimeline } from "@/components/booking/BookingTimeline";
import { AVAILABILITY_LABEL } from "@/components/quotes/QuoteCard";

interface BookingRequestFlowProps {
  vendorId: string;
  vendorName: string;
  quoteTotal: number;
  versionNumber: number;
  eventType: string;
  eventDate?: string;
  city: string;
  guestCount?: number;
  services: string[];
  included: string[];
  excluded: string[];
  availabilityState: PublicQuote["availabilityState"];
  bookingRequest: PublicBookingRequest | undefined;
  booking: PublicBooking | undefined;
  onRequest: (
    vendorId: string,
    idempotencyKey: string,
    expectedVersionNumber: number
  ) => Promise<{ ok: boolean; error?: string; errorCode?: string }>;
  onCancel: (vendorId: string, note: string | undefined) => Promise<{ ok: boolean; error?: string }>;
  onRefresh: () => Promise<void>;
}

type FlowState = "idle" | "review" | "submitting";

export function BookingRequestFlow({
  vendorId,
  vendorName,
  quoteTotal,
  versionNumber,
  eventType,
  eventDate,
  city,
  guestCount,
  services,
  included,
  excluded,
  availabilityState,
  bookingRequest,
  booking,
  onRequest,
  onCancel,
  onRefresh,
}: BookingRequestFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelError(null);
    setCancelSubmitting(true);
    track("booking_cancel_attempt", { vendorId });
    try {
      const result = await onCancel(vendorId, cancelNote.trim() || undefined);
      if (!result.ok) {
        track("booking_cancel_error", { vendorId });
        setCancelError(result.error ?? "Could not cancel booking.");
        return;
      }
      track("booking_cancel_success", { vendorId });
    } finally {
      setCancelSubmitting(false);
    }
  }

  // A genuinely ACTIVE booking request (still awaiting a decision, or already
  // confirmed and not since cancelled) blocks a new one and takes priority over
  // local flow state. A CLOSED-OUT outcome (REJECTED, EXPIRED, or ACCEPTED-but-
  // since-CANCELLED) is shown for context below, but does NOT block requesting
  // again — see findLatestByVendor()'s doc comment in StatusPageClient.tsx,
  // which was written anticipating exactly this ("a vendor can have more than
  // one BookingRequest/Booking once rebooking after cancellation/rejection is
  // possible") but nothing ever wired up a UI path to trigger it until now. The
  // booking-request creation route already allows this (its own "already
  // active" check excludes REJECTED/EXPIRED); this was purely a missing button.
  const isActiveBookingRequest =
    bookingRequest !== undefined &&
    (bookingRequest.status === "REQUESTED" ||
      bookingRequest.status === "UNDER_REVIEW" ||
      (bookingRequest.status === "ACCEPTED" && booking?.status !== "CANCELLED"));

  if (isActiveBookingRequest) {
    return (
      <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-sm">
        {bookingRequest!.status === "REQUESTED" || bookingRequest!.status === "UNDER_REVIEW" ? (
          <p className="text-amber-400">Waiting for {vendorName} to respond to your booking request.</p>
        ) : (
          <div>
            <p className="text-emerald-400">{vendorName} accepted your booking request.</p>
            {booking && <BookingTimeline entries={booking.timeline} />}
            {cancelError && (
              <div className="mt-2 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-2">
                {cancelError}
              </div>
            )}
            {!cancelling ? (
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className="mt-3 rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm"
              >
                Cancel Booking
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-zinc-300">Cancel this confirmed booking?</p>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  maxLength={500}
                  placeholder="Optional note..."
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelSubmitting}
                    className="rounded-md bg-red-800 text-red-50 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Confirm Cancellation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelling(false);
                      setCancelNote("");
                      setCancelError(null);
                    }}
                    disabled={cancelSubmitting}
                    className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const closedOutNotice = bookingRequest && (
    <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-sm">
      {bookingRequest.status === "ACCEPTED" && booking?.status === "CANCELLED" ? (
        <div>
          <p className="text-zinc-400">Your previous booking with {vendorName} was cancelled.</p>
          <BookingTimeline entries={booking.timeline} />
        </div>
      ) : bookingRequest.status === "REJECTED" ? (
        <div>
          <p className="text-red-400">{vendorName} declined your earlier booking request.</p>
          {bookingRequest.rejectionReason && (
            <p className="text-zinc-400 text-xs mt-1">{bookingRequest.rejectionReason}</p>
          )}
        </div>
      ) : (
        <p className="text-zinc-400">Your earlier booking request with {vendorName} expired.</p>
      )}
    </div>
  );

  async function handleConfirm() {
    setError(null);
    setErrorCode(undefined);
    setFlowState("submitting");
    track("booking_request_submit_attempt", { vendorId });
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    const result = await onRequest(vendorId, key, versionNumber);
    if (!result.ok) {
      track("booking_request_submit_error", { vendorId });
      setError(result.error ?? "Could not send booking request.");
      setErrorCode(result.errorCode);
      setFlowState("review");
      return;
    }
    track("booking_request_submitted", { vendorId });
  }

  if (flowState === "idle") {
    return (
      <>
        {closedOutNotice}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              track("booking_cta_clicked", { vendorId });
              track("booking_review_opened", { vendorId });
              setFlowState("review");
            }}
            className="rounded-md bg-emerald-700 text-emerald-50 px-3 py-2 text-sm hover:bg-emerald-600"
          >
            {closedOutNotice ? "Request Booking Again" : "Request Booking"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {closedOutNotice}
      <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-sm space-y-2">
        <p className="text-zinc-200">
          Confirm your booking request with <span className="font-medium">{vendorName}</span> for a total of{" "}
          <span className="font-mono">₹{quoteTotal.toLocaleString("en-IN")}</span>?
        </p>
        <div className="space-y-1 text-zinc-300">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Your Booking</p>
          <p>Event: {eventType}</p>
          {eventDate && <p>Date: {new Date(eventDate).toLocaleDateString()}</p>}
          <p>Location: {city}</p>
          {guestCount && <p>Guests: {guestCount}</p>}
          <p>Vendor: {vendorName}</p>
          {services.length > 0 && <p>Services: {services.join(", ")}</p>}
          <p>Availability: {AVAILABILITY_LABEL[availabilityState]}</p>
          {included.length > 0 && (
            <div>
              <p className="text-zinc-400">Included:</p>
              <ul className="list-disc list-inside text-zinc-300">
                {included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {excluded.length > 0 && (
            <div>
              <p className="text-zinc-400">Not included:</p>
              <ul className="list-disc list-inside text-zinc-300">
                {excluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-2">
            {errorCode === "BOOKING_REQUEST_ALREADY_ACTIVE" ? (
              <>
                You already have a pending request with this vendor.{" "}
                <a href="#quotes-section" className="underline">
                  View other options
                </a>
              </>
            ) : errorCode === "QUOTE_VERSION_MISMATCH" ? (
              <>
                This quote has been updated.{" "}
                <button
                  type="button"
                  onClick={async () => {
                    await onRefresh();
                    setError(null);
                    setErrorCode(undefined);
                  }}
                  className="underline"
                >
                  Refresh
                </button>
              </>
            ) : (
              error
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={flowState === "submitting"}
            className="rounded-md bg-emerald-700 text-emerald-50 px-3 py-2 text-sm disabled:opacity-50 hover:bg-emerald-600"
          >
            {flowState === "submitting" ? "Sending..." : "Confirm Request"}
          </button>
          <button
            type="button"
            onClick={() => setFlowState("idle")}
            disabled={flowState === "submitting"}
            className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
