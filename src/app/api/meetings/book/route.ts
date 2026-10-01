/**
 * MuggedMoments — POST /api/meetings/book
 *
 * Public endpoint for host customers to book a consultation meeting slot with
 * a specific vendor. Validates inputs and creates a VendorMeeting record in
 * status SCHEDULED.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { whatsApp } from "@/lib/whatsapp";
import { createAuditLog } from "@/domain/audit/auditService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendorId, customerName, customerPhone, customerEmail, meetingDate, timeSlot, notes } = body;

    if (!vendorId || typeof vendorId !== "string") {
      return NextResponse.json(
        { error: { message: "Vendor ID is required." } },
        { status: 400 }
      );
    }

    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return NextResponse.json(
        { error: { message: "Your name is required." } },
        { status: 400 }
      );
    }

    if (!customerPhone || typeof customerPhone !== "string" || !customerPhone.trim()) {
      return NextResponse.json(
        { error: { message: "Phone number is required." } },
        { status: 400 }
      );
    }

    if (!meetingDate) {
      return NextResponse.json(
        { error: { message: "Meeting date is required." } },
        { status: 400 }
      );
    }

    if (!timeSlot || typeof timeSlot !== "string") {
      return NextResponse.json(
        { error: { message: "Time slot is required." } },
        { status: 400 }
      );
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true, contactPhone: true, active: true },
    });

    if (!vendor || !vendor.active) {
      return NextResponse.json(
        { error: { message: "Vendor not found or inactive." } },
        { status: 404 }
      );
    }

    const formattedDate = new Date(meetingDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // Create VendorMeeting
    const meeting = await prisma.vendorMeeting.create({
      data: {
        vendorId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || null,
        meetingDate: new Date(meetingDate),
        timeSlot: timeSlot.trim(),
        notes: notes?.trim() || null,
        status: "SCHEDULED",
      },
      include: {
        vendor: {
          select: { name: true, city: true },
        },
      },
    });

    // Dispatch notification to Vendor
    if (vendor.contactPhone) {
      await whatsApp.sendMessage({
        to: vendor.contactPhone,
        body: `📅 New Consultation Booking!\nHost: ${customerName.trim()} (${customerPhone.trim()})\nDate: ${formattedDate} at ${timeSlot.trim()}\nNotes: ${notes || "None"}\nView & Confirm: http://localhost:3001/vendor/dashboard/meetings`,
      });
    }

    // Dispatch confirmation notification to Customer
    await whatsApp.sendMessage({
      to: customerPhone.trim(),
      body: `📅 Meeting Scheduled!\nYour consultation with ${vendor.name} is set for ${formattedDate} at ${timeSlot.trim()}.\nTrack status anytime: http://localhost:3001/my-requests`,
    });

    await createAuditLog({
      entityType: "VendorMeeting",
      entityId: meeting.id,
      action: "MEETING_BOOKED",
      actorType: "USER",
      metadata: { vendorId, customerName: customerName.trim(), customerPhone: customerPhone.trim(), meetingDate, timeSlot },
    });

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        publicId: meeting.publicId,
        vendorName: meeting.vendor.name,
        vendorCity: meeting.vendor.city,
        customerName: meeting.customerName,
        customerPhone: meeting.customerPhone,
        meetingDate: meeting.meetingDate,
        timeSlot: meeting.timeSlot,
        status: meeting.status,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to book meeting:", error);
    return NextResponse.json(
      { error: { message: "Failed to process meeting booking. Please try again." } },
      { status: 500 }
    );
  }
}
