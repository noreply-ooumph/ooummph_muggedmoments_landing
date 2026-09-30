/**
 * MuggedMoments — Main Landing Page & Lead Flow Application (client logic)
 *
 * Orchestrates STAGE 1 (Attract), STAGE 2 (Understand), STAGE 3 (Personalize),
 * STAGE 4 (Capture), STAGE 5 (Reassure), STAGE 6 (Convert), STAGE 7 (Continue).
 *
 * Features:
 * - Dynamic UTM attribution capture (useAttribution)
 * - Seamless modal/embedded Progressive Multi-Step Form
 * - Event preselection threading from hero cards or URL query
 * - State transition to SuccessConfirmation upon completion
 * - Sleek dark glassmorphic styling
 *
 * Extracted verbatim from the former page.tsx so the route's server-only
 * `metadata` export (see page.tsx) can coexist with this "use client" logic —
 * Next.js does not allow a client component to export `metadata`.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { EventTypes } from "@/components/landing/EventTypes";
import { WhatHappensNext } from "@/components/landing/WhatHappensNext";
import { TrustSection } from "@/components/landing/TrustSection";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { ProgressiveForm } from "@/components/form/ProgressiveForm";
import { SuccessConfirmation } from "@/components/success/SuccessConfirmation";
import { useAttribution } from "@/hooks/useAttribution";
import { Modal } from "@/components/ui";

export default function HomeClient() {
  const attribution = useAttribution();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string | undefined>(undefined);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Check URL parameters on mount for event preselection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const eventParam = params.get("event") || params.get("eventType");
      if (eventParam) {
        setSelectedEventType(eventParam);
        setFormOpen(true);
      }
    }
  }, []);

  const handleStartForm = (slug?: string) => {
    setSelectedEventType(slug);
    setFormOpen(true);
  };

  const handleFormSubmitSuccess = (response: any) => {
    setSuccessData(response);
    setFormOpen(false);
    // Smooth scroll to top to see success card clearly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setSuccessData(null);
    setSelectedEventType(undefined);
    setFormOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-400 selection:text-zinc-950">
      {/* Navigation Header */}
      <Header onStartForm={() => handleStartForm()} />

      <main className="flex-1">
        {/* If lead submitted successfully, show SuccessConfirmation at top */}
        {successData ? (
          <section className="py-16 px-4 max-w-4xl mx-auto">
            <SuccessConfirmation data={successData} onReset={handleReset} />
          </section>
        ) : null}

        {/* Hero Section */}
        <Hero
          onSelectEventType={(slug) => handleStartForm(slug)}
          onPrimaryCta={() => handleStartForm()}
        />

        {/* Event Types Detailed Breakdown */}
        <EventTypes onSelectEventType={(slug) => handleStartForm(slug)} />

        {/* What Happens Next - Stage 5 Reassurance */}
        <WhatHappensNext />

        {/* Trust & Guarantees */}
        <TrustSection />

        {/* FAQ */}
        <FAQ />
      </main>

      {/* Footer */}
      <Footer />

      {/* Progressive Multi-Step Form Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="Event Vendor Matching"
      >
        <ProgressiveForm
          initialEventSlug={selectedEventType}
          attribution={attribution}
          onSuccess={handleFormSubmitSuccess}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
