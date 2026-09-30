/**
 * MuggedMoments — POST /api/vendor/opportunities/[opportunityId]/respond (Stage 18, Phase 18.0)
 *
 * Session-gated, ownership-checked. A vendor must have already VIEWED the
 * opportunity (via GET .../[opportunityId]) before responding — this endpoint does
 * not implicitly mark it viewed itself; the API enforces this independently of the
 * UI, not just trusting that the UI only shows the buttons after a view.
 */

import { NextRequest, NextResponse } from "next/server";
import { OpportunityRespondSchema } from "@/lib/validation/schemas";
import { getVendorSession } from "@/lib/vendorSession";
import { nextStatus, isExpired } from "@/domain/opportunity/opportunityService";
import { createAuditLog } from "@/domain/audit/auditService";
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

  const parseResult = OpportunityRespondSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please provide a valid action." } },
      { status: 422 }
    );
  }

  const { opportunityId } = await params;

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  const now = new Date();

  if (isExpired(opportunity, now)) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_EXPIRED", message: "This opportunity has expired." } },
      { status: 409 }
    );
  }

  const action = parseResult.data.action === "INTERESTED" ? "INTERESTED" : "DECLINE";
  const resultingStatus = nextStatus(opportunity.status, action);

  if (!resultingStatus) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_OPPORTUNITY_TRANSITION",
          message: "This opportunity cannot be responded to in its current state.",
        },
      },
      { status: 422 }
    );
  }

  const updated = await prisma.vendorOpportunity.update({
    where: { id: opportunity.id },
    data: { status: resultingStatus, respondedAt: now },
  });

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: resultingStatus === "INTERESTED" ? "VENDOR_OPPORTUNITY_INTERESTED" : "VENDOR_OPPORTUNITY_DECLINED",
  });

  return NextResponse.json(
    { id: updated.id, status: updated.status, respondedAt: updated.respondedAt },
    { status: 200 }
  );
}
