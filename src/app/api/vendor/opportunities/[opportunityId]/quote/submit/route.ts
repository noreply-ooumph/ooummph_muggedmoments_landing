/**
 * MuggedMoments — POST /api/vendor/opportunities/[opportunityId]/quote/submit (Stage 18, Phase 18.1/18.4)
 *
 * Session-gated, ownership-checked. Validates every §18.9 checkpoint before allowing
 * submission of the current DRAFT QuoteVersion — on failure, the draft is untouched.
 *
 * The opportunity's own status transition to QUOTE_SUBMITTED fires only for a
 * first-ever submission (versionNumber 1) — a revision's submission (versionNumber
 * > 1) leaves the opportunity's status untouched, since it's already QUOTE_SUBMITTED
 * and correctly stays there for the rest of its lifecycle (see opportunityService.ts;
 * that file itself is not touched by this phase).
 */

import { NextRequest, NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import { nextStatus } from "@/domain/opportunity/opportunityService";
import { getDraftVersion } from "@/domain/quote/quoteVersionService";
import { getSubmissionFailureReasons } from "@/domain/quote/quoteService";
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

  const { opportunityId } = await params;

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { id: opportunityId },
    include: { quote: { include: { versions: { include: { lineItems: true } } } } },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  const draft = opportunity.quote ? getDraftVersion(opportunity.quote.versions) : null;

  if (!draft) {
    return NextResponse.json(
      { error: { code: "QUOTE_NOT_FOUND", message: "No quote draft exists yet." } },
      { status: 404 }
    );
  }

  const now = new Date();
  const reasons = getSubmissionFailureReasons(
    {
      lineItems: draft.lineItems,
      availabilityState: draft.availabilityState,
      validUntil: draft.validUntil,
    },
    now
  );

  if (reasons.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "QUOTE_VALIDATION_FAILED",
          message: "This quote isn't ready to submit yet.",
          reasons,
        },
      },
      { status: 422 }
    );
  }

  const updatedVersion = await prisma.quoteVersion.update({
    where: { id: draft.id },
    data: { status: "SUBMITTED", submittedAt: now },
    include: { lineItems: { orderBy: { order: "asc" } } },
  });

  // Only a first-ever submission (version 1) transitions the opportunity itself —
  // a revision's submission leaves it as QUOTE_SUBMITTED, which it already is.
  if (updatedVersion.versionNumber === 1) {
    const resultingStatus = nextStatus(opportunity.status, "SUBMIT_QUOTE");
    if (resultingStatus) {
      await prisma.vendorOpportunity.update({
        where: { id: opportunity.id },
        data: { status: resultingStatus },
      });
    }
  }

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: "VENDOR_QUOTE_SUBMITTED",
    metadata: { versionNumber: updatedVersion.versionNumber },
  });

  return NextResponse.json(
    {
      id: updatedVersion.id,
      status: updatedVersion.status,
      versionNumber: updatedVersion.versionNumber,
      submittedAt: updatedVersion.submittedAt,
    },
    { status: 200 }
  );
}
