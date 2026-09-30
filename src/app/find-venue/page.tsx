/**
 * MuggedMoments — /find-venue
 *
 * Category discovery page: /plan-event's form, pre-filled with the "venue"
 * service slug (verified against config/services.ts).
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryDiscoveryClient } from "../_category-discovery/CategoryDiscoveryClient";

export const metadata: Metadata = {
  title: "Find a Venue",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right venues.",
};

export default function FindVenuePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <CategoryDiscoveryClient headline="Looking for a venue?" serviceSlug="venue" />
    </Suspense>
  );
}
