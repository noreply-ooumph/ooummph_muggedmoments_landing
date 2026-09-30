/**
 * MuggedMoments — POST /api/vendor/opportunities/[opportunityId]/messages (Stage 18, Phase 18.5)
 *
 * Session-gated, ownership-checked — same pattern as every vendor route since Phase
 * 18.0. Gated symmetrically with the customer-side send route: a submitted quote
 * must exist (getCurrentVersion() non-null) before either party can message.
 */

import { NextRequest, NextResponse } from "next/server";
import { QuoteMessageSchema } from "@/lib/validation/schemas";
import { getVendorSession } from "@/lib/vendorSession";
import { getCurrentVersion } from "@/domain/quote/quoteVersionService";
import { createAuditLog } from "@/domain/audit/auditService";
import { detectContactInfo, CONTACT_INFO_BLOCKED_MESSAGE } from "@/domain/messaging/contactInfoFilter";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ opportunityId: string }> }
): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
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

  const { opportunityId } = await params;

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { id: opportunityId },
    include: { quote: { include: { versions: true } } },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  const current = opportunity.quote ? getCurrentVersion(opportunity.quote.versions) : null;
  if (!current || !opportunity.quote) {
    return NextResponse.json(
      { error: { code: "QUOTE_NOT_FOUND", message: "No submitted quote exists yet." } },
      { status: 404 }
    );
  }

  const message = await prisma.quoteMessage.create({
    data: {
      quoteId: opportunity.quote.id,
      senderType: "VENDOR",
      body: parseResult.data.body,
    },
  });

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: "QUOTE_MESSAGE_SENT",
    metadata: { senderType: "VENDOR" },
  });

  return NextResponse.json(
    { senderType: message.senderType, body: message.body, createdAt: message.createdAt },
    { status: 201 }
  );
}
