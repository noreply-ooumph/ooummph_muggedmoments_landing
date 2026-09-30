/**
 * MuggedMoments — /find-caterer
 *
 * Category discovery page: /plan-event's form, pre-filled with the
 * "catering" service slug (verified against config/services.ts — the
 * catalog uses "catering", not "caterer").
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryDiscoveryClient } from "../_category-discovery/CategoryDiscoveryClient";

export const metadata: Metadata = {
  title: "Find a Caterer",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right caterers.",
};

export default function FindCatererPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <CategoryDiscoveryClient headline="Looking for a caterer?" serviceSlug="catering" />
    </Suspense>
  );
}
