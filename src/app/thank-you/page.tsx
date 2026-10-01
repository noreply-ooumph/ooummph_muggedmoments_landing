/**
 * MuggedMoments — /thank-you
 *
 * Thin server wrapper — mirrors the same server/client split already used
 * by /status/[publicLeadId]. Delegates to ThankYouClient for the actual
 * fetch/render logic (search-param access requires a client component).
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { ThankYouClient } from "./ThankYouClient";

export const metadata: Metadata = {
  title: "Thank You",
};

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 py-16 px-4">
        <Suspense
          fallback={
            <div className="max-w-lg mx-auto text-center text-zinc-400">
              <p>Loading your request…</p>
            </div>
          }
        >
          <ThankYouClient />
        </Suspense>
      </main>
    </div>
  );
}
