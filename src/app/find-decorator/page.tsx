/**
 * MuggedMoments — /find-decorator
 *
 * Category discovery page: /plan-event's form, pre-filled with the
 * "decoration" service slug (verified against config/services.ts — the
 * catalog uses "decoration", not "decorator").
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryDiscoveryClient } from "../_category-discovery/CategoryDiscoveryClient";

export const metadata: Metadata = {
  title: "Find a Decorator",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right decorators.",
};

export default function FindDecoratorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <CategoryDiscoveryClient
        headline="Looking for a decorator?"
        serviceSlug="decoration"
      />
    </Suspense>
  );
}
