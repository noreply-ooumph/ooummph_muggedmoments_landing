/**
 * MuggedMoments — /find-makeup-artist
 *
 * Category discovery page: /plan-event's form, pre-filled with the
 * "makeup" service slug (verified against config/services.ts — the
 * SERVICES catalog's exact slug for this category, not a guessed string).
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryDiscoveryClient } from "../_category-discovery/CategoryDiscoveryClient";

export const metadata: Metadata = {
  title: "Find a Makeup Artist",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right makeup artists.",
};

export default function FindMakeupArtistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <CategoryDiscoveryClient
        headline="Looking for a makeup artist?"
        serviceSlug="makeup"
      />
    </Suspense>
  );
}
