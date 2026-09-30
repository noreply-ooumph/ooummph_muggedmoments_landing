/**
 * MuggedMoments — /plan-event
 *
 * Additive route: the same ProgressiveForm the homepage already opens in a
 * modal, rendered inline on its own dedicated, linkable URL. The homepage's
 * existing modal flow (HomeClient.tsx) is completely unchanged by this file.
 * Thin server wrapper carrying only `metadata`; see PlanEventClient.tsx for
 * why the interactive body lives there instead.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanEventClient } from "./PlanEventClient";

export const metadata: Metadata = {
  title: "Plan Your Event",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right venues and vendors.",
};

export default function PlanEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <PlanEventClient />
    </Suspense>
  );
}
