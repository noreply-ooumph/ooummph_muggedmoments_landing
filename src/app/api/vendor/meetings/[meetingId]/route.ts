/**
 * MuggedMoments — PATCH /api/vendor/meetings/[meetingId]
 *
 * Session-gated endpoint for a vendor to update the status of a scheduled meeting
 * (e.g. to CONFIRMED, COMPLETED, or CANCELLED).
 */

import { NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";
import { whatsApp } from "@/lib/whatsapp";
import { createAuditLog } from "@/domain/audit/auditService";

const VALID_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getVendorSession();
    if (!session) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { meetingId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: { message: "Invalid meeting status." } },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.vendorMeeting.findUnique({
      where: { id: meetingId },
      include: { vendor: { select: { name: true } } },
    });

    if (!existing || existing.vendorId !== session.vendorId) {
      return NextResponse.json(
        { error: { message: "Meeting not found or forbidden." } },
        { status: 404 }
      );
    }

    const updated = await prisma.vendorMeeting.update({
      where: { id: meetingId },
      data: { status },
    });

    const formattedDate = new Date(updated.meetingDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // Notify customer about status change
    await whatsApp.sendMessage({
      to: updated.customerPhone,
      body: `✨ Meeting Status Update!\n${existing.vendor.name} has ${status === "CONFIRMED" ? "CONFIRMED ✓" : status} your consultation scheduled for ${formattedDate} at ${updated.timeSlot}.\nCheck live status: http://localhost:3001/my-requests`,
    });

    await createAuditLog({
      entityType: "VendorMeeting",
      entityId: updated.id,
      action: "MEETING_STATUS_CHANGED",
      actorType: "USER",
      metadata: { status, customerPhone: updated.customerPhone },
    });

    return NextResponse.json({
      success: true,
      meeting: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to update meeting status:", error);
    return NextResponse.json(
      { error: { message: "Failed to update meeting status." } },
      { status: 500 }
    );
  }
}
