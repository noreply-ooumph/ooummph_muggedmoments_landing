/**
 * MuggedMoments — Public Site Header
 *
 * Persistent header for customer-facing, unauthenticated pages (/vendors,
 * /vendors/[vendorId]) — these previously had zero site chrome, no logo, nothing
 * linking back to the homepage. Same amber/zinc brand tokens as Header.tsx and
 * VendorDashboardShell.tsx, but a separate, purpose-built component: Header.tsx
 * takes an onStartForm prop tied to the homepage's own modal-launch logic and
 * #anchor links specific to homepage sections, so it isn't reusable here without
 * reaching into homepage-only interactive state. This header only ever links to
 * real routes, no modal, no session/auth awareness.
 */

import Link from "next/link";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset, not an optimizable remote image */}
          <img src="/logo-icon.png" alt="" className="h-9 w-auto shrink-0" />
          <span className="font-extrabold text-lg text-white tracking-tight">
            Mugged<span className="text-amber-400">Moments</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-xs font-medium text-zinc-400">
          <Link href="/vendors" className="hover:text-amber-400 transition-colors">
            Explore Vendors
          </Link>
          <Link href="/my-requests" className="hover:text-amber-400 transition-colors">
            Check My Status
          </Link>
          <Link
            href="/"
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold text-xs px-4 py-2 rounded-lg shadow-md shadow-amber-400/10"
          >
            Plan My Event
          </Link>
        </nav>
      </div>
    </header>
  );
}
