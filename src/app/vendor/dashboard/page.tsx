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
    redirect("/vendor");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    include: { _count: { select: { portfolioItems: true } } },
  });

  if (!vendor) {
    redirect("/vendor");
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

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">{vendor.name}</h1>
        <p className="text-sm text-zinc-400 mb-4">{vendor.city}</p>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      {scheduledMeetingsCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 flex items-center justify-between gap-3 shadow-inner">
          <div>
            <p className="font-bold text-amber-400 text-sm">📅 New Meeting Request{scheduledMeetingsCount > 1 ? "s" : ""}</p>
            <p className="text-zinc-300 mt-0.5">
              You have <span className="font-bold text-white">{scheduledMeetingsCount}</span> customer consultation{scheduledMeetingsCount > 1 ? "s" : ""} awaiting review.
            </p>
          </div>
          <Link
            href="/vendor/dashboard/meetings"
            className="px-3 py-1.5 bg-amber-400 text-zinc-950 font-bold rounded-lg hover:bg-amber-300 shrink-0 transition-colors"
          >
            Review →
          </Link>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-zinc-400 mb-2">
          Profile completeness{" "}
          <span className="text-zinc-600">(this gates whether you can be matched)</span>
        </p>
        <ul className="space-y-1">
          {completenessChecks.map((check) => (
            <li key={check.label} className="text-sm flex items-center gap-2">
              <span className={check.done ? "text-emerald-400" : "text-zinc-600"}>
                {check.done ? "✓" : "✗"}
              </span>
              <span className={check.done ? "text-zinc-300" : "text-zinc-500"}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
        {completenessChecks.some((c) => !c.done) && (
          <Link
            href="/vendor/dashboard/edit"
            className="inline-block mt-2 text-xs text-amber-400 underline hover:text-amber-300"
          >
            Complete your profile →
          </Link>
        )}
      </div>

      {vendor._count.portfolioItems === 0 && (
        <div className="mb-6 text-sm bg-zinc-800/40 border border-zinc-700 rounded-md p-3">
          <p className="text-zinc-300 mb-1">
            Add a portfolio photo to help customers trust your profile.
          </p>
          <Link
            href="/vendor/dashboard/edit"
            className="text-xs text-amber-400 underline hover:text-amber-300"
          >
            Add photos →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/vendor/dashboard/edit"
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          Edit profile
        </Link>
        <Link
          href="/vendor/dashboard/opportunities"
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          Opportunities
        </Link>
        <Link
          href="/vendor/dashboard/booking-requests"
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          Booking Requests
        </Link>
        <Link
          href="/vendor/dashboard/availability"
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          Availability
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
