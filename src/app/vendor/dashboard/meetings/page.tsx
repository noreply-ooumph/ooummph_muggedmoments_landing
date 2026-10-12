/**
 * MuggedMoments — /vendor/dashboard/meetings
 *
 * Session-gated server component for vendors to view and manage customer consultation
 * meeting requests in real-time.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";
import { VendorMeetingsClient } from "./VendorMeetingsClient";

export default async function VendorMeetingsPage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/join-as-vendor");
  }

  const initialMeetings = await prisma.vendorMeeting.findMany({
    where: { vendorId: session.vendorId },
    orderBy: { meetingDate: "asc" },
  });

  return (
    <div className="w-full space-y-6">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Scheduled Customer Meetings
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Review, confirm, or manage upcoming customer consultation requests.
            </p>
          </div>
          <Link
            href="/vendor/dashboard"
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-lg transition-colors border border-zinc-700/60"
          >
            ← Back to Dashboard
          </Link>
        </div>

      <VendorMeetingsClient
        initialMeetings={initialMeetings.map((m) => ({
          id: m.id,
          publicId: m.publicId,
          customerName: m.customerName,
          customerPhone: m.customerPhone,
          customerEmail: m.customerEmail,
          meetingDate: m.meetingDate.toISOString(),
          timeSlot: m.timeSlot,
          notes: m.notes,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
      </div>
    </div>
  );
}
