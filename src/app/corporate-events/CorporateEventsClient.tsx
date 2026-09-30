/**
 * MuggedMoments — /corporate-events client logic
 *
 * Mirrors PlanEventClient.tsx's exact structure, with initialEventSlug
 * hardcoded to "corporate" (verified against config/event-types.ts) instead
 * of read from a query param — no useSearchParams needed here, so no
 * Suspense boundary required either, unlike /plan-event.
 */

"use client";

import React from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ProgressiveForm } from "@/components/form/ProgressiveForm";

export function CorporateEventsClient() {
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
            Plan your corporate event
          </h1>
          <p className="mt-3 text-zinc-300">
            Tell us your event, budget, date and city. We&apos;ll help you
            discover the right venues and event professionals.
          </p>
        </div>

        <div id="event-form">
          <ProgressiveForm
            initialEventSlug="corporate"
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
