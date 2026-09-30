/**
 * MuggedMoments — POST /api/vendor/booking-requests/[bookingRequestId]/cancel
 * (Stage 19, Phase 19.5)
 *
 * Session-gated, ownership-checked (404 on mismatch — same posture as
 * accept/reject). Cancellation is a Booking-level concept, not a
 * BookingRequest-level one: BookingRequest.status stays ACCEPTED forever,
 * a permanent historical fact — only Booking.status flips to CANCELLED.
 *
 * Idempotent: cancelling an already-CANCELLED booking returns 200 with the
 * current state rather than erroring, matching the accept route's posture.
 *
 * VendorAvailability is deleted for (vendorId, date) on cancellation,
 * reverting to UNKNOWN — this row only ever existed because of the booking
 * being cancelled, and "no record = UNKNOWN, never guess AVAILABLE" is the
 * established philosophy (see availabilityService.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import { CancelBookingSchema } from "@/lib/validation/schemas";
import { createAuditLog } from "@/domain/audit/auditService";
import { runAutomation } from "@/services/automation/automationService";
import { whatsApp } from "@/lib/whatsapp";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingRequestId: string }> }
): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const { bookingRequestId } = await params;

  const bookingRequest = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: {
      opportunity: {
        select: {
          vendorId: true,
          lead: { select: { id: true, publicLeadId: true, phone: true, whatsappConsent: true } },
          vendor: { select: { name: true } },
        },
      },
      booking: true,
    },
  });

  if (!bookingRequest || bookingRequest.opportunity.vendorId !== session.vendorId || !bookingRequest.booking) {
    return NextResponse.json(
      { error: { code: "BOOKING_NOT_FOUND", message: "Booking not found." } },
      { status: 404 }
    );
  }

  const booking = bookingRequest.booking;

  // Idempotent: a retried cancel click returns the current (already-cancelled) state.
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ bookingId: booking.id, status: booking.status }, { status: 200 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine — note is optional.
  }

  const parseResult = CancelBookingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid cancellation." } },
      { status: 422 }
    );
  }
  const { note } = parseResult.data;

  await prisma.$transaction(async (tx) => {
    await tx.vendorAvailability.deleteMany({
      where: { vendorId: booking.vendorId, date: booking.date },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledBy: "VENDOR" },
    });

    await tx.bookingStatusHistory.create({
      data: { bookingId: booking.id, status: "CANCELLED", note: note ?? null },
    });
  });

  await createAuditLog({
    entityType: "Booking",
    entityId: booking.id,
    action: "BOOKING_CANCELLED",
    actorType: "USER",
    metadata: { cancelledBy: "VENDOR", note },
  });

  // Stage 19, Phase 19.7.7 — customer notification, same runAutomation()
  // pattern as accept/reject. Only the vendor-initiated cancel route notifies
  // the customer — the customer's own cancel route (booking/cancel) does not
  // self-notify the person who just performed the action.
  const lead = bookingRequest.opportunity.lead;
  const vendorName = bookingRequest.opportunity.vendor.name;
  await runAutomation(
    { leadId: lead.id, automationType: "BOOKING_CANCELLED_NOTIFICATION", version: bookingRequestId },
    async () => {
      if (!lead.whatsappConsent) {
        return { sent: false, reason: "no_channel_opted_in" };
      }
      const result = await whatsApp.sendMessage({
        to: lead.phone,
        body: `${vendorName} has cancelled your confirmed booking. Reference: ${lead.publicLeadId}.`,
      });
      return { sent: result.success };
    }
  );

  return NextResponse.json({ bookingId: booking.id, status: "CANCELLED" }, { status: 200 });
}
