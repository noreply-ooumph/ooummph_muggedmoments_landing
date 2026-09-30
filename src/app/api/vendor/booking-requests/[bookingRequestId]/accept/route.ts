/**
 * MuggedMoments — POST /api/vendor/booking-requests/[bookingRequestId]/accept
 * (Stage 19, Phase 19.1)
 *
 * Session-gated, ownership-checked (404 on mismatch — never leak existence to a
 * non-owner, same posture as POST /api/vendor/opportunities/[id]/respond).
 *
 * Idempotent by the natural key: if a Booking already exists for this
 * bookingRequestId, a retried accept click returns the existing booking with 200
 * rather than erroring — no new client-supplied idempotency key is needed since
 * this is a session-authenticated action, not a public replay-prone one.
 *
 * The VendorAvailability claim (§4 of the work order) is the load-bearing
 * correctness section: seed.ts already seeds a real AVAILABLE row (Vendor A,
 * 2027-06-15) alongside an UNAVAILABLE one (Vendor B, same date) — a naive
 * create()-only approach would wrongly 409 the legitimate Vendor A accept. The
 * two-branch create-then-conditional-update logic below handles both the
 * "no prior row" and "benign prior row" cases while still relying on the
 * existing @@unique([vendorId, date]) to fail loudly on a genuine concurrent
 * double-accept.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getVendorSession } from "@/lib/vendorSession";
import { nextBookingRequestStatus, isBookingRequestExpired } from "@/domain/booking/bookingRequestService";
import { getCurrentVersion } from "@/domain/quote/quoteVersionService";
import { createAuditLog } from "@/domain/audit/auditService";
import { generatePublicBookingId } from "@/lib/idempotency";
import { runAutomation } from "@/services/automation/automationService";
import { whatsApp } from "@/lib/whatsapp";
import prisma from "@/lib/db/prisma";

class DateAlreadyBookedError extends Error {}

export async function POST(
  _request: Request,
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
        include: {
          lead: { select: { eventDate: true, id: true, publicLeadId: true, phone: true, whatsappConsent: true } },
          quote: { include: { versions: true } },
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

  // Idempotency-first: a retried accept click returns the existing booking.
  const existingBooking = await prisma.booking.findUnique({ where: { bookingRequestId } });
  if (existingBooking) {
    return NextResponse.json(
      { bookingId: existingBooking.id, status: existingBooking.status, date: existingBooking.date },
      { status: 200 }
    );
  }

  if (!nextBookingRequestStatus(bookingRequest.status, "ACCEPT")) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BOOKING_REQUEST_TRANSITION",
          message: "This booking request cannot be accepted in its current state.",
        },
      },
      { status: 409 }
    );
  }

  const now = new Date();

  if (isBookingRequestExpired(bookingRequest, now)) {
    return NextResponse.json(
      { error: { code: "BOOKING_REQUEST_EXPIRED", message: "This booking request has expired." } },
      { status: 409 }
    );
  }

  const eventDate = bookingRequest.opportunity.lead.eventDate;
  if (!eventDate) {
    return NextResponse.json(
      { error: { code: "MISSING_EVENT_DATE", message: "This request has no event date to confirm against." } },
      { status: 422 }
    );
  }

  const current = bookingRequest.opportunity.quote
    ? getCurrentVersion(bookingRequest.opportunity.quote.versions)
    : null;
  if (!current || current.id !== bookingRequest.quoteVersionId) {
    return NextResponse.json(
      {
        error: {
          code: "QUOTE_VERSION_MISMATCH",
          message: "This quote has changed since the booking was requested. Please review the latest version.",
        },
      },
      { status: 409 }
    );
  }

  const date = new Date(eventDate);
  date.setUTCHours(0, 0, 0, 0);
  const vendorId = session.vendorId;

  // Stage 19, Phase 19.7.3 — same generate-then-check-collision pattern as
  // generatePublicLeadId()'s one call site in leadService.ts.
  let publicBookingId = generatePublicBookingId();
  let publicIdAttempts = 0;
  while (publicIdAttempts < 5) {
    const collision = await prisma.booking.findUnique({ where: { publicBookingId } });
    if (!collision) break;
    publicBookingId = generatePublicBookingId();
    publicIdAttempts++;
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // IMPORTANT: Postgres aborts the whole transaction after any failed
      // statement — every later query in the same transaction then fails with
      // 25P02 ("current transaction is aborted"), even inside a try/catch. So
      // this must never attempt a query that might hit the unique constraint
      // and then keep querying the same transaction afterward. Read first,
      // branch in JS, and let a genuine race (two concurrent creates) simply
      // propagate out of the transaction to be handled below, with nothing
      // else run in that transaction after it fails.
      const existingAvailability = await tx.vendorAvailability.findUnique({
        where: { vendorId_date: { vendorId, date } },
      });

      if (existingAvailability) {
        if (existingAvailability.status === "UNAVAILABLE") {
          throw new DateAlreadyBookedError();
        }
        // Safe to overwrite a benign pre-existing AVAILABLE/UNKNOWN row (e.g.
        // seed data). The conditional WHERE makes this atomic against a
        // concurrent accept for the same vendor+date: if another transaction
        // already flipped it to UNAVAILABLE and committed first, this matches
        // zero rows rather than silently double-booking.
        const updateResult = await tx.vendorAvailability.updateMany({
          where: { vendorId, date, status: { not: "UNAVAILABLE" } },
          data: { status: "UNAVAILABLE", source: "BOOKING_ACCEPTED" },
        });
        if (updateResult.count === 0) {
          throw new DateAlreadyBookedError();
        }
      } else {
        // No prior row. If a concurrent transaction creates one first, this
        // throws P2002 and propagates out untouched — no further query is
        // attempted in this transaction after that.
        await tx.vendorAvailability.create({
          data: { vendorId, date, status: "UNAVAILABLE", source: "BOOKING_ACCEPTED" },
        });
      }

      const created = await tx.booking.create({
        data: { bookingRequestId, vendorId, date, status: "CONFIRMED", publicBookingId },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: created.id,
          status: "CONFIRMED",
          note: "Created on acceptance of booking request.",
        },
      });

      await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: { status: "ACCEPTED", respondedAt: now },
      });

      return created;
    });

    await createAuditLog({
      entityType: "BookingRequest",
      entityId: bookingRequestId,
      action: "BOOKING_REQUEST_ACCEPTED",
      actorType: "USER",
      metadata: { bookingId: booking.id, vendorId, date: date.toISOString() },
    });

    // Stage 19, Phase 19.7.7 — customer notification only (this app has no
    // consent/contact mechanism for vendors, only Lead.whatsappConsent, so a
    // vendor-directed notification would require inventing a new trust
    // concept — out of scope here). runAutomation() gives this the same
    // idempotency (keyed per bookingRequestId, so a retried accept never
    // double-notifies) and audit trail (AUTOMATION_STARTED/SUCCEEDED/FAILED)
    // already used for WHATSAPP_HANDOFF/INCOMPLETE_REMINDER — no new bespoke
    // "notified" audit action needed.
    const lead = bookingRequest.opportunity.lead;
    const vendorName = bookingRequest.opportunity.vendor.name;
    await runAutomation(
      { leadId: lead.id, automationType: "BOOKING_ACCEPTED_NOTIFICATION", version: bookingRequestId },
      async () => {
        if (!lead.whatsappConsent) {
          return { sent: false, reason: "no_channel_opted_in" };
        }
        const result = await whatsApp.sendMessage({
          to: lead.phone,
          body: `Good news! ${vendorName} has confirmed your booking. Reference: ${lead.publicLeadId}.`,
        });
        return { sent: result.success };
      }
    );

    return NextResponse.json(
      { bookingId: booking.id, status: booking.status, date: booking.date },
      { status: 201 }
    );
  } catch (err) {
    const isUniqueConstraintRace =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (err instanceof DateAlreadyBookedError || isUniqueConstraintRace) {
      return NextResponse.json(
        { error: { code: "DATE_ALREADY_BOOKED", message: "You already have a confirmed booking on this date." } },
        { status: 409 }
      );
    }
    throw err;
  }
}
