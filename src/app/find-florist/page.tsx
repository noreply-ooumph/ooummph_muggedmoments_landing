/**
 * MuggedMoments — /find-florist
 *
 * Category discovery page: /plan-event's form, pre-filled with the
 * "flowers" service slug (verified against config/services.ts — the
 * SERVICES catalog's exact slug for this category, not a guessed string).
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryDiscoveryClient } from "../_category-discovery/CategoryDiscoveryClient";

export const metadata: Metadata = {
  title: "Find a Florist",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right florists.",
};

export default function FindFloristPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <CategoryDiscoveryClient
        headline="Looking for a florist?"
        serviceSlug="flowers"
      />
    </Suspense>
  );
}
