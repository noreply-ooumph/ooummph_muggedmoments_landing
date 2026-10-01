/**
 * MuggedMoments — GET /api/vendor/meetings
 *
 * Session-gated vendor endpoint to fetch all scheduled consultation meetings
 * for the logged-in vendor.
 */

import { NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getVendorSession();
    if (!session) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const meetings = await prisma.vendorMeeting.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { meetingDate: "asc" },
    });

    return NextResponse.json({
      meetings: meetings.map((m) => ({
        id: m.id,
        publicId: m.publicId,
        customerName: m.customerName,
        customerPhone: m.customerPhone,
        customerEmail: m.customerEmail,
        meetingDate: m.meetingDate,
        timeSlot: m.timeSlot,
        notes: m.notes,
        status: m.status,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch vendor meetings:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch meetings." } },
      { status: 500 }
    );
  }
}
