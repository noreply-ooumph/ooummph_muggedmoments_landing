/**
 * MuggedMoments — Booking Recovery Banner (Stage 19, Phase 19.3)
 *
 * Display-only, no props, no state — mirrors ConfirmedBookingCard.tsx's posture.
 * Deliberately does not inspect matches/quotes content or predict whether real
 * alternatives exist: MatchList.tsx already renders its own honest empty/found
 * state below this banner. This component's only job is reassurance that a
 * rejected/expired request did not lose any previously entered requirements.
 */

import { Alert } from "@/components/ui";

export function BookingRecoveryBanner() {
  return (
    <div className="mb-6">
      <Alert type="info" title="Keep exploring your options">
        One of your booking requests didn&apos;t go through, but nothing about your
        request was lost. Your other matched vendors and quotes below are still
        available — there&apos;s no need to fill anything out again.
      </Alert>
    </div>
  );
}
