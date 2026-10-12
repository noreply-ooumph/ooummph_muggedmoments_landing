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
  counts: { opportunities: number; bookingRequests: number; meetings?: number };
  children: React.ReactNode;
}

export function VendorDashboardShell({ vendor, counts, children }: VendorDashboardShellProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/vendor/dashboard", label: "Dashboard" },
    { href: "/vendor/dashboard/opportunities", label: "Opportunities", count: counts.opportunities },
    { href: "/vendor/dashboard/booking-requests", label: "Booking Requests", count: counts.bookingRequests },
    { href: "/vendor/dashboard/meetings", label: "Meetings", count: counts.meetings },
    { href: "/vendor/dashboard/availability", label: "Availability" },
    { href: "/vendor/dashboard/edit", label: "Edit Profile" },
  ];

  const badge = VERIFICATION_BADGE[vendor.verificationStatus] ?? VERIFICATION_BADGE.PENDING;

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset, not an optimizable remote image */}
            <img src="/logo-icon.png" alt="" className="h-9 w-auto shrink-0 drop-shadow-md" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate tracking-tight">{vendor.name}</p>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                <span>📍</span> {vendor.city}
              </p>
            </div>
            <StatusBadge label={badge.label} tone={badge.tone} className="ml-1 shrink-0" />
          </div>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent"
                  }`}
                >
                  <span>{item.label}</span>
                  {typeof item.count === "number" && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        active
                          ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="ml-2 pl-2 border-l border-zinc-800">
              <LogoutButton />
            </div>
          </nav>
        </div>

        {/* Mobile nav row */}
        <nav className="md:hidden flex flex-wrap items-center gap-1.5 px-4 pb-3 text-xs font-medium border-t border-zinc-900 pt-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  active
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {item.label}
                {typeof item.count === "number" && (
                  <span className="ml-1 text-[10px] opacity-75">({item.count})</span>
                )}
              </Link>
            );
          })}
          <LogoutButton />
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col">{children}</main>
    </div>
  );
}
