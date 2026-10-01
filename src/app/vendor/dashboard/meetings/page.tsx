/**
 * MuggedMoments — /vendor/dashboard/meetings
 *
 * Session-gated server component for vendors to view and manage customer consultation
 * meeting requests in real-time.
 */

import { redirect } from "next/navigation";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";
import { VendorMeetingsClient } from "./VendorMeetingsClient";

export default async function VendorMeetingsPage() {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
  }

  const initialMeetings = await prisma.vendorMeeting.findMany({
    where: { vendorId: session.vendorId },
    orderBy: { meetingDate: "asc" },
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Scheduled Customer Meetings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Review, confirm, or manage upcoming customer consultation requests.
        </p>
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
  );
}
