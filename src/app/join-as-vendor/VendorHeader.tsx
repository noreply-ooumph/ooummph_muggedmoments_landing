/**
 * MuggedMoments — /join-as-vendor Header (vendor-context, dedicated)
 *
 * Replaces the earlier approach of reusing src/components/landing/Header.tsx
 * (the customer-landing-page header) on this page. That header's nav anchors
 * (#event-types, #how-it-works, #reassurance) pointed to sections that don't
 * exist here, and its "Check My Status" link sent vendors into the customer
 * phone-lookup flow (/my-requests) instead of back to their own dashboard —
 * a real dead-end for a returning vendor trying to check on new opportunities.
 *
 * Same precedent VendorDashboardShell.tsx already followed for the dashboard
 * pages (see its header comment): brand tokens carried over, but a separate
 * component per audience rather than overloading the homepage header. Header.tsx
 * itself is untouched — it's still correctly used by the customer-facing pages.
 *
 * Nav anchors here point to sections actually present on this page (see
 * page.tsx's `id="why-join"` / `id="how-it-works"`; FAQ's id="faq" comes from
 * the shared FAQ component). "Vendor Login" goes straight to /vendor, which
 * already logs an existing phone number straight into /vendor/dashboard.
 */

"use client";

import Link from "next/link";
import { SELLER_LANDING_CONTENT } from "@/config/content";

export function VendorHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/join-as-vendor" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset, not an optimizable remote image */}
          <img src="/logo-icon.png" alt="" className="h-9 w-auto shrink-0" />
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">
              Mugged<span className="text-amber-400">Moments</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              For Vendors
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
          <a href="#why-join" className="hover:text-amber-400 transition-colors">
            Why Join
          </a>
          <a href="#how-it-works" className="hover:text-amber-400 transition-colors">
            How It Works
          </a>
          <a href="#faq" className="hover:text-amber-400 transition-colors">
            FAQ
          </a>
          <Link href="/vendor" className="hover:text-amber-400 transition-colors">
            Vendor Login
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/vendor"
            className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-md shadow-amber-400/10 px-4 py-2 text-xs"
          >
            {SELLER_LANDING_CONTENT.primaryCta}
          </Link>
        </div>
      </div>
    </header>
  );
}
