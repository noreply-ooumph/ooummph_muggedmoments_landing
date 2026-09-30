/**
 * MuggedMoments — POST /api/leads/[publicLeadId]/quotes/[vendorId]/booking-request (Stage 19, Phase 19.0)
 *
 * Public, unauthenticated — same trust model as resumeLead() in leadService.ts:
 * "knowledge of the public ID is treated as sufficient capability to act on that
 * lead." No session, no new auth mechanism.
 *
 * Idempotency key is checked FIRST, before any other processing, mirroring
 * findExistingLeadByIdempotencyKey() in leadService.ts — a replay returns the
 * same row rather than erroring.
 *
 * responseDeadline (48h) is computed locally here, not imported from
 * opportunityService.ts — that constant governs a different state machine
 * (vendor response to an opportunity), and BookingRequest has no transitions
 * wired yet beyond creation, so no shared state-machine file exists for it.
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicLeadIdSchema, CreateBookingRequestSchema } from "@/lib/validation/schemas";
import { getCurrentVersion } from "@/domain/quote/quoteVersionService";
import { calculateTotal } from "@/domain/quote/quoteService";
import { createAuditLog } from "@/domain/audit/auditService";
import { isBookingRequestExpired } from "@/domain/booking/bookingRequestService";
import prisma from "@/lib/db/prisma";

// Rate limiting state (in-memory for development) — same pattern as POST /api/leads.
// PRODUCTION: Replace with Redis-backed rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

const RESPONSE_DEADLINE_HOURS = 48;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

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

  if (isRateLimited(publicLeadId)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again." } },
      { status: 429 }
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

  const parseResult = CreateBookingRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid booking request." } },
      { status: 422 }
    );
  }
  const { idempotencyKey, expectedVersionNumber } = parseResult.data;

  // Idempotency check FIRST — a replay of an already-created request returns
  // the same row rather than re-validating or erroring.
  const existing = await prisma.bookingRequest.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return NextResponse.json(
      {
        vendorId,
        status: existing.status,
        createdAt: existing.createdAt,
      },
      { status: 201 }
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
    include: { quote: { include: { versions: { include: { lineItems: true } } } } },
  });

  if (!opportunity) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  const current = opportunity.quote ? getCurrentVersion(opportunity.quote.versions) : null;
  if (!current || !opportunity.quote) {
    return NextResponse.json(
      { error: { code: "QUOTE_NOT_FOUND", message: "No submitted quote exists yet for this vendor." } },
      { status: 404 }
    );
  }

  if (current.versionNumber !== expectedVersionNumber) {
    return NextResponse.json(
      {
        error: {
          code: "QUOTE_VERSION_MISMATCH",
          message: "This quote has changed since you last viewed it. Please refresh and review the latest version.",
        },
      },
      { status: 409 }
    );
  }

  const now = new Date();

  const activeRequest = await prisma.bookingRequest.findFirst({
    where: {
      opportunityId: opportunity.id,
      status: { in: ["REQUESTED", "UNDER_REVIEW"] },
    },
  });
  // A REQUESTED row whose deadline has already passed is expired, not active —
  // same read-time-derived-expiry rule as everywhere else in this codebase
  // (isBookingRequestExpired() is never a stored transition). Without this
  // check, a customer whose earlier request with this vendor simply expired
  // could never request again: the stale row's DB status is still "REQUESTED"
  // forever, so an exact status-only check here would keep 409-ing them.
  if (activeRequest && !isBookingRequestExpired(activeRequest, now)) {
    return NextResponse.json(
      {
        error: {
          code: "BOOKING_REQUEST_ALREADY_ACTIVE",
          message: "A booking request is already pending for this vendor.",
        },
      },
      { status: 409 }
    );
  }

  const responseDeadline = new Date(now.getTime() + RESPONSE_DEADLINE_HOURS * 60 * 60 * 1000);

  const bookingRequest = await prisma.bookingRequest.create({
    data: {
      idempotencyKey,
      opportunityId: opportunity.id,
      quoteVersionId: current.id,
      responseDeadline,
    },
  });

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: "BOOKING_REQUEST_CREATED",
    actorType: "USER",
    metadata: {
      bookingRequestId: bookingRequest.id,
      quoteVersionId: current.id,
      quoteTotal: calculateTotal(current.lineItems),
    },
  });

  return NextResponse.json(
    {
      vendorId,
      status: bookingRequest.status,
      createdAt: bookingRequest.createdAt,
    },
    { status: 201 }
  );
}
