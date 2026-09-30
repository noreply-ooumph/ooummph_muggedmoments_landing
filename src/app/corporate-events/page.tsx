/**
 * MuggedMoments — /corporate-events
 *
 * Same form as /plan-event, pre-selecting the "corporate" event type
 * (verified against config/event-types.ts). No useSearchParams here, so no
 * Suspense boundary needed, unlike /plan-event.
 */

import type { Metadata } from "next";
import { CorporateEventsClient } from "./CorporateEventsClient";

export const metadata: Metadata = {
  title: "Plan a Corporate Event",
  description:
    "Tell us your event, budget, date and city. We'll match you with the right venues and vendors for your corporate event.",
};

export default function CorporateEventsPage() {
  return <CorporateEventsClient />;
}
