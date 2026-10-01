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
    redirect("/vendor");
  }

  const rows = await listVendorAvailability(session.vendorId);

  const dates = rows.map((r) => ({
    date: r.date.toISOString(),
    status: r.status,
    source: r.source,
  }));

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Availability</h1>
        <Link href="/vendor/dashboard" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          Back
        </Link>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        Block off dates you know you&apos;re busy, or confirm dates you&apos;re free.
        This is separate from your confirmed bookings — a date already booked with
        a customer can&apos;t be changed here.
      </p>

      <AvailabilityClient initialDates={dates} />
    </div>
  );
}
