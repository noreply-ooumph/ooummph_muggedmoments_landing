/**
 * MuggedMoments — shared category discovery page body
 *
 * Used by /find-photographer, /find-venue, /find-decorator, /find-caterer —
 * each is a ~15-line page.tsx passing its own headline + verified service
 * slug here, avoiding four near-identical copies of this same body.
 *
 * The `_category-discovery` folder name is underscore-prefixed, which Next.js
 * App Router excludes from routing (a "private folder") — this file is never
 * itself reachable as a route.
 *
 * Reuses the same Header/Footer/ProgressiveForm composition as
 * /plan-event/PlanEventClient.tsx, with one service pre-selected instead of
 * an event type, via ProgressiveForm's initialServices prop (Task 6).
 */

"use client";

import React from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ProgressiveForm } from "@/components/form/ProgressiveForm";

export function CategoryDiscoveryClient({
  headline,
  serviceSlug,
}: {
  headline: string;
  serviceSlug: string;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        onStartForm={() =>
          document
            .getElementById("event-form")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />

      <main className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {headline}
          </h1>
          <p className="mt-3 text-zinc-300">
            Tell us your event, budget, date and city. We&apos;ll match you
            with the right venues and vendors.
          </p>
        </div>

        <div id="event-form">
          <ProgressiveForm
            initialServices={[serviceSlug]}
            onSuccess={(response) => {
              window.location.href = `/thank-you?leadId=${encodeURIComponent(
                response.publicLeadId
              )}`;
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
