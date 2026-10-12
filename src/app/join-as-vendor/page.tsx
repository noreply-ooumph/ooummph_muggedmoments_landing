/**
 * MuggedMoments — /join-as-vendor (vendor acquisition landing page)
 *
 * Pure server component — no client state of its own. The two interactive
 * leaves (VendorPageHeader, VendorHeroCta) are the minimal client boundaries
 * needed for onClick handlers; everything else here is static composition.
 *
 * Copy sourced and reconciled across PRD v2.0, the Final Copy Deck, and the
 * Positioning/Launch System doc — see SELLER_LANDING_CONTENT/SELLER_FAQ_ITEMS
 * in config/content.ts for the source-by-source reasoning. This page never
 * touches /vendor's auth flow — every CTA here is a plain link into it.
 */

import type { Metadata } from "next";
import { Footer } from "@/components/landing/Footer";
import { FAQ } from "@/components/landing/FAQ";
import { SELLER_LANDING_CONTENT, SELLER_FAQ_ITEMS } from "@/config/content";
import { VendorPageHeader } from "./VendorPageHeader";
import { VendorHeroCta } from "./VendorHeroCta";

export const metadata: Metadata = {
  title: "Join as a Vendor",
  description: SELLER_LANDING_CONTENT.heroHeadline,
};

export default function JoinAsVendorPage() {
  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col font-sans">
      <VendorPageHeader />

      <main className="flex-1">
          {/* Hero */}
          <section className="py-24 px-4 text-center bg-transparent">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto drop-shadow-md">
                {SELLER_LANDING_CONTENT.heroHeadline}
              </h1>
              <div className="mt-8">
                <VendorHeroCta label={SELLER_LANDING_CONTENT.primaryCta} />
              </div>
            </div>
          </section>

          {/* Why join */}
          <section id="why-join" className="py-20 px-4 bg-transparent border-t border-zinc-800/60">
            <div className="max-w-5xl mx-auto">
              <p className="text-center text-lg text-zinc-300 max-w-2xl mx-auto mb-12">
                {SELLER_LANDING_CONTENT.whyJoinIntro}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {SELLER_LANDING_CONTENT.benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="p-6 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:border-amber-500/40 rounded-xl shadow-xl transition-all duration-200 hover:-translate-y-1"
                  >
                    <p className="text-sm font-semibold text-white">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="py-20 px-4 bg-transparent border-t border-zinc-800/60">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-12">
                How it works
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {SELLER_LANDING_CONTENT.howItWorksSteps.map((step, idx) => (
                  <div
                    key={step}
                    className="p-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:border-amber-500/40 rounded-xl text-center shadow-xl transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm mb-3">
                      {idx + 1}
                    </div>
                    <p className="text-xs font-semibold text-white">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Trust */}
          <section className="py-12 px-4 bg-transparent border-t border-zinc-800/60">
            <p className="text-center text-sm text-zinc-400 max-w-2xl mx-auto">
              {SELLER_LANDING_CONTENT.trustLine}
            </p>
          </section>

          <FAQ title="Vendor FAQ" items={SELLER_FAQ_ITEMS} />

          {/* WhatsApp Vendor Community */}
          <section className="py-16 px-4 border-t border-zinc-800/60 bg-transparent">
            <div className="max-w-3xl mx-auto bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-emerald-950/60 border border-emerald-500/40 rounded-2xl p-8 text-center backdrop-blur-md shadow-2xl">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 text-2xl mb-4 border border-emerald-500/40">
                💬
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                Join Our Official Vendor WhatsApp Network
              </h2>
              <p className="text-sm text-zinc-300 max-w-xl mx-auto mb-6 leading-relaxed">
                Stay updated with real-time lead alerts, instant client request notifications, and network with top verified event partners in your city.
              </p>
              <a
                href="https://chat.whatsapp.com/D7TWeA4gF2cBHaXbzXF7Qi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 px-8 py-3.5 text-sm"
              >
                <span>Join Official WhatsApp Group</span>
                <span>→</span>
              </a>
            </div>
          </section>

          {/* Final CTA band */}
          <section className="py-20 px-4 text-center border-t border-zinc-800/60 bg-transparent">
            <a
              href="/vendor"
              className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-lg shadow-amber-400/10 px-8 py-4 text-base"
            >
              {SELLER_LANDING_CONTENT.primaryCta}
            </a>
          </section>
        </main>

        <Footer />
    </div>
  );
}
