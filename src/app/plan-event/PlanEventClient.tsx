/**
 * MuggedMoments — /plan-event client logic
 *
 * Reads the optional ?event=<slug> query param and passes it through to
 * ProgressiveForm's existing initialEventSlug preselection mechanism. Also reads
 * ?services=<comma-separated slugs> and ?city=<name> the same way, for the public
 * vendor profile page's "Start Planning" CTA (see /vendors/[vendorId]) — these are
 * a head start on the deterministic matching form, not a guarantee of matching with
 * any specific vendor.
 *
 * Renders Header/Footer itself (rather than from the server page.tsx) because
 * a server component cannot pass an inline event-handler function as a prop
 * to a client component such as Header — this was discovered during the
 * build verification for this task, see implementation report.
 */

"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ProgressiveForm } from "@/components/form/ProgressiveForm";

export function PlanEventClient() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event") ?? undefined;
  const servicesParam = searchParams.get("services");
  const services = servicesParam
    ? servicesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const city = searchParams.get("city") ?? undefined;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col font-sans">
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
            Plan your event
          </h1>
          <p className="mt-3 text-zinc-300">
            Tell us your event, budget, date and city. We&apos;ll help you
            discover the right venues and event professionals.
          </p>
        </div>

        <div id="event-form">
          <ProgressiveForm
            initialEventSlug={eventSlug}
            initialServices={services}
            initialCity={city}
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
