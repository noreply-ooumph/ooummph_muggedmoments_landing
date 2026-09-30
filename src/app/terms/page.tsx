/**
 * MuggedMoments — /terms
 *
 * Stub page. Real legal copy is pending legal review. This page exists only
 * so the Footer's Terms of Service link resolves, rather than pointing
 * nowhere.
 *
 * `robots: noindex` is deliberate: this stub must not be indexed as if it
 * were the final terms.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-6">
          Terms of Service
        </h1>
        <p className="text-zinc-300 leading-relaxed">
          This policy is pending legal review and is not yet final.
        </p>
        <p className="text-zinc-400 text-sm mt-4">
          If you have questions about these terms, please contact
          MuggedMoments support.
        </p>
      </main>
    </div>
  );
}
