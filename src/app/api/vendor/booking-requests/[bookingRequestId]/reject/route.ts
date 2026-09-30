/**
 * MuggedMoments — POST /api/vendor/booking-requests/[bookingRequestId]/reject
 * (Stage 19, Phase 19.1)
 *
 * Session-gated, ownership-checked. No expiry check — rejecting an already-expired
 * request is allowed (it has no availability side effects, and gives the vendor a
 * way to formally close out a stale request). No new customer-facing code is
 * needed for this to reach the customer: getLeadByPublicId() and
 * BookingRequestFlow.tsx already query/render bookingRequests[].status and
 * .rejectionReason as of Phase 19.0.
 */

import { NextRequest, NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import { RejectBookingRequestSchema } from "@/lib/validation/schemas";
import { nextBookingRequestStatus, resolveRejectionReasonText } from "@/domain/booking/bookingRequestService";
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
    },
  });

  if (!bookingRequest || bookingRequest.opportunity.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "BOOKING_REQUEST_NOT_FOUND", message: "Booking request not found." } },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = RejectBookingRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message ?? "Invalid rejection." } },
      { status: 422 }
    );
  }
  const { reason, note } = parseResult.data;

  if (!nextBookingRequestStatus(bookingRequest.status, "REJECT")) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BOOKING_REQUEST_TRANSITION",
          message: "This booking request cannot be rejected in its current state.",
        },
      },
      { status: 409 }
    );
  }

  const rejectionReason = resolveRejectionReasonText(reason, note);

  const updated = await prisma.bookingRequest.update({
    where: { id: bookingRequestId },
    data: { status: "REJECTED", rejectionReason, respondedAt: new Date() },
  });

  await createAuditLog({
    entityType: "BookingRequest",
    entityId: bookingRequestId,
    action: "BOOKING_REQUEST_REJECTED",
    actorType: "USER",
    metadata: { reason, ...(reason === "OTHER" ? { note } : {}) },
  });

  // Stage 19, Phase 19.7.7 — customer notification, same runAutomation()
  // pattern as the accept route (idempotent per bookingRequestId, audited via
  // AUTOMATION_STARTED/SUCCEEDED/FAILED).
  const lead = bookingRequest.opportunity.lead;
  const vendorName = bookingRequest.opportunity.vendor.name;
  await runAutomation(
    { leadId: lead.id, automationType: "BOOKING_REJECTED_NOTIFICATION", version: bookingRequestId },
    async () => {
      if (!lead.whatsappConsent) {
        return { sent: false, reason: "no_channel_opted_in" };
      }
      const result = await whatsApp.sendMessage({
        to: lead.phone,
        body: `${vendorName} was unable to accept your booking request. Reference: ${lead.publicLeadId}.`,
      });
      return { sent: result.success };
    }
  );

  return NextResponse.json(
    { status: updated.status, rejectionReason: updated.rejectionReason },
    { status: 200 }
  );
}
