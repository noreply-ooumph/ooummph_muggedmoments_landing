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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col space-y-6">
        {/* WhatsApp VIP Community Banner */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-emerald-950/80 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl shrink-0 border border-emerald-500/30 shadow-inner">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  Exclusive Partner Network
                </span>
                <span className="text-xs text-amber-400 font-semibold animate-pulse">
                  ⚡ Don&apos;t miss high-converting opportunities!
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
                Haven&apos;t Joined Our Official WhatsApp VIP Group Yet?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Get instant client lead alerts, priority booking requests, and connect directly with top event planners in your region. Join now so you never miss an opportunity!
              </p>
            </div>
          </div>
          <a
            href="https://chat.whatsapp.com/D7TWeA4gF2cBHaXbzXF7Qi"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
          >
            <span>Join WhatsApp Group Now</span>
            <span className="text-base">→</span>
          </a>
        </div>

        {children}
      </main>
    </div>
  );
}
