/**
 * MuggedMoments — /privacy
 *
 * Stub page. Real legal copy is pending legal review (see the MuggedMoments
 * Final Copy Deck, Section 6 — WhatsApp consent language explicitly requires
 * legal sign-off before publication). This page exists only so the Footer's
 * Privacy Policy link resolves, rather than pointing nowhere.
 *
 * `robots: noindex` is deliberate: this stub must not be indexed as if it
 * were the final policy.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-6">
          Privacy Policy
        </h1>
        <p className="text-zinc-300 leading-relaxed">
          This policy is pending legal review and is not yet final.
        </p>
        <p className="text-zinc-400 text-sm mt-4">
          If you have questions about how your information is handled, please
          contact MuggedMoments support.
        </p>
      </main>
    </div>
  );
}
