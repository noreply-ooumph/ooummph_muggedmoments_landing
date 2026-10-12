/**
 * MuggedMoments — /vendor/dashboard
 *
 * Session-gated server component. No middleware is used anywhere in this app —
 * every vendor-only page calls getVendorSession() directly and redirects to
 * /vendor if there is no valid session (this convention continues into Phases 1-5).
 *
 * Shows the vendor's honest verificationStatus — never claims VERIFIED unless
 * an operator has actually set it (see VendorVerificationStatus enum).
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { LogoutButton } from "./LogoutButton";

// Matches VendorDashboardShell.tsx's VERIFICATION_BADGE map exactly — same 3 keys,
// same tones. Kept as a separate const here rather than importing the shell's map
// since that map isn't exported (shell-internal); if this drifts from the shell's
// map in the future, that's a real bug to fix by exporting one shared source.
const VERIFICATION_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: "Pending review", tone: "amber" },
  VERIFIED: { label: "Verified", tone: "emerald" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export default async function VendorDashboardPage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/join-as-vendor");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    include: { _count: { select: { portfolioItems: true } } },
  });

  if (!vendor) {
    redirect("/join-as-vendor");
  }

  const status = VERIFICATION_BADGE[vendor.verificationStatus] ?? VERIFICATION_BADGE.PENDING;

  // Same 3 fields deriveProfileComplete() (domain/vendorProfile/vendorProfileService.ts)
  // checks — computed per-field here (not via that function) because this checklist
  // needs to show each field individually, not just the aggregate boolean it returns.
  // Portfolio is deliberately NOT part of this list — it isn't part of the real
  // matching-eligibility gate (see Correction 2, public-trust-ux-phase-1-6-brief.md),
  // and is surfaced separately below so the two are never conflated.
  const completenessChecks = [
    { label: "About", done: vendor.about !== null && vendor.about.trim().length > 0 },
    { label: "Starting price", done: vendor.startingPrice !== null },
    { label: "Service areas", done: vendor.serviceAreas.length > 0 },
  ];

  const scheduledMeetingsCount = await prisma.vendorMeeting.count({
    where: { vendorId: session.vendorId, status: "SCHEDULED" },
  });

  const [opportunityCount, bookingRequestCount] = await Promise.all([
    prisma.vendorOpportunity.count({ where: { vendorId: session.vendorId } }),
    prisma.bookingRequest.count({ where: { opportunity: { vendorId: session.vendorId } } }),
  ]);

  const completedChecksCount = completenessChecks.filter((c) => c.done).length;
  const isFullyComplete = completedChecksCount === completenessChecks.length;

  return (
    <div className="w-full space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {vendor.name}
            </h1>
            <StatusBadge label={status.label} tone={status.tone} />
          </div>
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <span>📍 {vendor.city}</span>
            <span>•</span>
            <span>Partner Vendor Portal</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/vendor/dashboard/opportunities"
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2"
          >
            <span>View Opportunities</span>
            <span>→</span>
          </Link>
          <Link
            href="/vendor/dashboard/edit"
            className="px-4 py-2.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 font-semibold text-xs rounded-xl transition-all"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Priority Meeting Banner */}
      {scheduledMeetingsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-6 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-xl font-bold shrink-0">
              📅
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300">
                Action Required: {scheduledMeetingsCount} Consultation Meeting{scheduledMeetingsCount > 1 ? "s" : ""}
              </h3>
              <p className="text-xs text-zinc-300 mt-1">
                Customers have scheduled a direct consultation meeting with your representative.
              </p>
            </div>
          </div>
          <Link
            href="/vendor/dashboard/meetings"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl transition-all shrink-0 self-stretch sm:self-auto text-center shadow-lg"
          >
            Review Meetings →
          </Link>
        </div>
      )}

      {/* Executive Stat Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          href="/vendor/dashboard/opportunities"
          className="group bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 backdrop-blur-md shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Active Opportunities
            </span>
            <span className="w-8 h-8 rounded-lg bg-zinc-800/80 group-hover:bg-amber-500/20 text-zinc-300 group-hover:text-amber-400 flex items-center justify-center text-sm transition-colors">
              ⚡
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors">
              {opportunityCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Matching lead requests from clients
            </p>
          </div>
        </Link>

        <Link
          href="/vendor/dashboard/booking-requests"
          className="group bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 backdrop-blur-md shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Booking Requests
            </span>
            <span className="w-8 h-8 rounded-lg bg-zinc-800/80 group-hover:bg-amber-500/20 text-zinc-300 group-hover:text-amber-400 flex items-center justify-center text-sm transition-colors">
              📋
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors">
              {bookingRequestCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Quotes and direct booking requests
            </p>
          </div>
        </Link>

        <Link
          href="/vendor/dashboard/meetings"
          className="group bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 backdrop-blur-md shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Scheduled Meetings
            </span>
            <span className="w-8 h-8 rounded-lg bg-zinc-800/80 group-hover:bg-amber-500/20 text-zinc-300 group-hover:text-amber-400 flex items-center justify-center text-sm transition-colors">
              📅
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors">
              {scheduledMeetingsCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Confirmed consultations
            </p>
          </div>
        </Link>
      </div>

      {/* Profile Completeness & Portfolio Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Readiness Checklist */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Profile Readiness</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Required details for event matching eligibility
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${
                isFullyComplete
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {completedChecksCount} / {completenessChecks.length} Completed
            </span>
          </div>

          <div className="space-y-3">
            {completenessChecks.map((check) => (
              <div
                key={check.label}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      check.done
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                    }`}
                  >
                    {check.done ? "✓" : "!"}
                  </div>
                  <span className="text-sm font-medium text-zinc-200">{check.label}</span>
                </div>
                <span className={`text-xs font-semibold ${check.done ? "text-emerald-400" : "text-amber-400"}`}>
                  {check.done ? "Ready" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          {!isFullyComplete && (
            <Link
              href="/vendor/dashboard/edit"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors pt-2"
            >
              <span>Complete remaining details</span>
              <span>→</span>
            </Link>
          )}
        </div>

        {/* Portfolio Showcase Trust Card */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-white">Portfolio Showcase</h2>
              <span className="text-xs text-zinc-500 font-mono">
                {vendor._count.portfolioItems} Photos Uploaded
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Showcase high-quality photos of your past events to build instant trust with potential clients. Profiles with photos get up to 3x higher booking request conversion.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {vendor._count.portfolioItems === 0
                ? "No portfolio photos added yet."
                : `${vendor._count.portfolioItems} portfolio item(s) visible to clients.`}
            </span>
            <Link
              href="/vendor/dashboard/edit"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-semibold text-xs rounded-xl transition-all border border-zinc-700/60"
            >
              {vendor._count.portfolioItems === 0 ? "Add Photos →" : "Manage Photos →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
