/**
 * MuggedMoments — POST /api/leads/[publicLeadId]/quotes/[vendorId]/messages (Stage 18, Phase 18.5)
 *
 * Public, unauthenticated — same trust model as resumeLead() in leadService.ts:
 * "knowledge of the public ID is treated as sufficient capability to act on that
 * lead." No session, no new auth mechanism.
 *
 * Gated symmetrically with the vendor-side send route: a submitted quote must exist
 * (getCurrentVersion() non-null) before either party can message about it.
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicLeadIdSchema, QuoteMessageSchema } from "@/lib/validation/schemas";
import { getCurrentVersion } from "@/domain/quote/quoteVersionService";
import { createAuditLog } from "@/domain/audit/auditService";
import { detectContactInfo, CONTACT_INFO_BLOCKED_MESSAGE } from "@/domain/messaging/contactInfoFilter";
import prisma from "@/lib/db/prisma";

// Rate limiting state (in-memory for development) — same pattern as POST /api/leads.
// PRODUCTION: Replace with Redis-backed rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

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
      { error: { code: "RATE_LIMITED", message: "Too many messages. Please wait before sending another." } },
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

  const parseResult = QuoteMessageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please enter a valid message." } },
      { status: 422 }
    );
  }

  if (detectContactInfo(parseResult.data.body)) {
    return NextResponse.json(
      { error: { code: "CONTACT_INFO_NOT_ALLOWED", message: CONTACT_INFO_BLOCKED_MESSAGE } },
      { status: 422 }
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
    include: { quote: { include: { versions: true } } },
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

  const message = await prisma.quoteMessage.create({
    data: {
      quoteId: opportunity.quote.id,
      senderType: "CUSTOMER",
      body: parseResult.data.body,
    },
  });

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: "QUOTE_MESSAGE_SENT",
    actorType: "USER",
    metadata: { senderType: "CUSTOMER" },
  });

  return NextResponse.json(
    { senderType: message.senderType, body: message.body, createdAt: message.createdAt },
    { status: 201 }
  );
}
