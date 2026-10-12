/**
 * MuggedMoments — /vendor/dashboard/availability
 *
 * Server component, same session-gated convention as every other page under
 * /vendor/dashboard/* (this layer's own redirect is inert now that
 * layout.tsx's shared check runs first — see that file's comment — kept for
 * the same "minimal diff" reason those checks were left in place elsewhere).
 *
 * Fixes the gap identified alongside the customer/admin lead-edit paths: a
 * vendor previously had no way to declare their own availability — it was
 * only ever inferred as a side effect of accepting a booking request. See
 * AvailabilityClient.tsx for the interactive piece.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getVendorSession } from "@/lib/vendorSession";
import { listVendorAvailability } from "@/domain/availability/availabilityService";
import { AvailabilityClient } from "./AvailabilityClient";

export default async function VendorAvailabilityPage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/join-as-vendor");
  }

  const rows = await listVendorAvailability(session.vendorId);

  const dates = rows.map((r) => ({
    date: r.date.toISOString(),
    status: r.status,
    source: r.source,
  }));

  return (
    <div className="w-full space-y-6">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Calendar Availability</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Manage your available and unavailable dates for client matching
            </p>
          </div>
          <Link
            href="/vendor/dashboard"
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-lg transition-colors border border-zinc-700/60"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed mb-6 bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3.5">
          ℹ️ Block off dates you know you&apos;re busy, or confirm dates you&apos;re free. This is separate from your confirmed bookings — a date already booked with a customer can&apos;t be changed here.
        </p>

        <AvailabilityClient initialDates={dates} />
      </div>
    </div>
  );
}
