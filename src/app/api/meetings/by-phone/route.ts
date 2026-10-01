/**
 * MuggedMoments — POST /api/meetings/by-phone
 *
 * Public lookup endpoint for customers to view their scheduled vendor meetings
 * using their phone number on /my-requests.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: { message: "Phone number is required." } },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    const meetings = await prisma.vendorMeeting.findMany({
      where: {
        customerPhone: {
          contains: cleanPhone.replace(/[\s\-\+\(\)]/g, ""),
          mode: "insensitive",
        },
      },
      include: {
        vendor: {
          select: { id: true, name: true, city: true },
        },
      },
      orderBy: { meetingDate: "asc" },
    });

    return NextResponse.json({
      meetings: meetings.map((m) => ({
        id: m.id,
        publicId: m.publicId,
        vendorId: m.vendorId,
        vendorName: m.vendor.name,
        vendorCity: m.vendor.city,
        customerName: m.customerName,
        customerPhone: m.customerPhone,
        meetingDate: m.meetingDate,
        timeSlot: m.timeSlot,
        notes: m.notes,
        status: m.status,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Failed to query meetings by phone:", error);
    return NextResponse.json(
      { error: { message: "Failed to query meetings." } },
      { status: 500 }
    );
  }
}
