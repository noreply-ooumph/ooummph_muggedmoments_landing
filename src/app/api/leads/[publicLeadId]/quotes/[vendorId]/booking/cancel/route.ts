/**
 * MuggedMoments — POST /api/leads/[publicLeadId]/quotes/[vendorId]/booking/cancel
 * (Stage 19, Phase 19.5)
 *
 * Public, unauthenticated — same trust model as the booking-request creation
 * route: "knowledge of the public ID is treated as sufficient capability to
 * act on that lead." No session, no new auth mechanism.
 *
 * Mirrors the vendor cancel route's logic exactly (same idempotency,
 * VendorAvailability deletion, BookingStatusHistory row), with
 * cancelledBy: "CUSTOMER" instead of "VENDOR".
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicLeadIdSchema, CancelBookingSchema } from "@/lib/validation/schemas";
import { createAuditLog } from "@/domain/audit/auditService";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicLeadId: string; vendorId: string }> }
): Promise<NextResponse> {
  const { publicLeadId, vendorId } = await params;

  const idParseResult = PublicLeadIdSchema.safeParse(publicLeadId);
  if (!idParseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid lead ID format." } },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findUnique({ where: { publicLeadId } });
  if (!lead) {
    return NextResponse.json(
      { error: { code: "LEAD_NOT_FOUND", message: "Lead not found." } },
      { status: 404 }
    );
  }

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { leadId_vendorId: { leadId: lead.id, vendorId } },
  });
  if (!opportunity) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  // Finds the BookingRequest that actually HAS a booking, not just whichever
  // BookingRequest row is newest — now that rebooking with the same vendor
  // after a rejection/cancellation is reachable (see BookingRequestFlow.tsx),
  // a vendor can genuinely have more than one BookingRequest row here, and the
  // newest one may be a fresh REQUESTED row with no booking yet while an
  // OLDER row holds the real confirmed Booking this call needs to cancel. Same
  // "most recent by the BOOKING's own createdAt" disambiguation rule as
  // findLatestByVendor() in StatusPageClient.tsx.
  const bookingRequestsWithBooking = await prisma.bookingRequest.findMany({
    where: { opportunityId: opportunity.id, booking: { isNot: null } },
    include: { booking: true },
  });

  const bookingRequest = bookingRequestsWithBooking.reduce<
    (typeof bookingRequestsWithBooking)[number] | null
  >((latest, current) => {
    if (!latest) return current;
    return current.booking!.createdAt > latest.booking!.createdAt ? current : latest;
  }, null);

  if (!bookingRequest || !bookingRequest.booking) {
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
      data: { status: "CANCELLED", cancelledBy: "CUSTOMER" },
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
    metadata: { cancelledBy: "CUSTOMER", note },
  });

  return NextResponse.json({ bookingId: booking.id, status: "CANCELLED" }, { status: 200 });
}
