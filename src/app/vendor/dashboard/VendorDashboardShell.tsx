/**
 * MuggedMoments — Vendor Dashboard Shell
 *
 * Persistent header + nav for every page under /vendor/dashboard/*. Rendered by
 * src/app/vendor/dashboard/layout.tsx, which does the one shared session check +
 * vendor fetch and passes the result down here — individual pages no longer need to
 * render their own copy of this chrome.
 *
 * Brand tokens (amber-400 accent, zinc-950/900/800 surfaces, "MM" logo mark) are
 * carried over from src/components/landing/Header.tsx, adapted for the vendor
 * context — that file is homepage-specific (onStartForm prop, #anchor nav) and is
 * intentionally left untouched.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { LogoutButton } from "./LogoutButton";

const VERIFICATION_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: "Pending review", tone: "amber" },
  VERIFIED: { label: "Verified", tone: "emerald" },
  REJECTED: { label: "Rejected", tone: "red" },
};

interface NavItem {
  href: string;
  label: string;
  count?: number;
}

interface VendorDashboardShellProps {
  vendor: { name: string; city: string; verificationStatus: string };
  counts: { opportunities: number; bookingRequests: number };
  children: React.ReactNode;
}

export function VendorDashboardShell({ vendor, counts, children }: VendorDashboardShellProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/vendor/dashboard", label: "Dashboard" },
    { href: "/vendor/dashboard/opportunities", label: "Opportunities", count: counts.opportunities },
    { href: "/vendor/dashboard/booking-requests", label: "Booking Requests", count: counts.bookingRequests },
    { href: "/vendor/dashboard/availability", label: "Availability" },
    { href: "/vendor/dashboard/edit", label: "Edit Profile" },
  ];

  const badge = VERIFICATION_BADGE[vendor.verificationStatus] ?? VERIFICATION_BADGE.PENDING;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset, not an optimizable remote image */}
            <img src="/logo-icon.png" alt="" className="h-9 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{vendor.name}</p>
              <p className="text-xs text-zinc-500 truncate">{vendor.city}</p>
            </div>
            <StatusBadge label={badge.label} tone={badge.tone} className="ml-1" />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors ${
                    active ? "text-amber-400" : "hover:text-amber-400"
                  }`}
                >
                  {item.label}
                  {typeof item.count === "number" && (
                    <span className="ml-1 text-zinc-600">({item.count})</span>
                  )}
                </Link>
              );
            })}
            <LogoutButton />
          </nav>
        </div>

        {/*
          Mobile nav row — same links, no hidden md:flex gate, below the header bar.
          Phase 5 fix: this previously used overflow-x-auto, which genuinely scrolled
          (verified: scrollWidth 448px vs clientWidth 375px at the 375px preset) but
          gave no visual hint that it did — "Log out" and part of "Edit Profile" were
          invisible off-screen with nothing suggesting a swipe. flex-wrap replaces
          that: only 5 short items, so they wrap to a second line and every item is
          always visible with no hidden/scrollable content.
        */}
        <nav className="md:hidden flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 text-xs font-medium text-zinc-400">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${active ? "text-amber-400" : "hover:text-amber-400"}`}
              >
                {item.label}
                {typeof item.count === "number" && (
                  <span className="ml-1 text-zinc-600">({item.count})</span>
                )}
              </Link>
            );
          })}
          <LogoutButton />
        </nav>
      </header>

      {/*
        Phase 5 fix: flex-col instead of the previous flex-row default. Every page
        except the quote builder renders one child, so this is a no-op for them
        (still centered identically). The quote builder renders two siblings
        (QuoteBuilderClient + an optional message-thread card with its own mt-4) —
        under flex-row (the previous behavior, unchanged since before this shell
        existed) they sat side by side and overflowed badly at mobile width
        (verified: 449px content in a 375px box). flex-col stacks them vertically,
        which is what that page's own mt-4 on the second card already implied was
        intended — mt-4 has no visual effect in a row layout.
      */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">{children}</main>
    </div>
  );
}
