/**
 * MuggedMoments — POST /api/vendor/opportunities/[opportunityId]/quote/revise (Stage 18, Phase 18.4)
 *
 * Session-gated, ownership-checked. Opens a new DRAFT QuoteVersion for a quote whose
 * current version is SUBMITTED, pre-filled from that current version (so the vendor
 * edits a head start, not a blank form). At most one DRAFT may exist per quote at a
 * time — enforced here in application logic, not a DB constraint (see quoteVersioning
 * ground truth: the single-vendor-editing-their-own-quote access pattern, already
 * enforced by session + ownership checks everywhere else, makes a DB constraint
 * unnecessary machinery for this).
 */

import { NextRequest, NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import { getCurrentVersion, getDraftVersion, nextVersionNumber } from "@/domain/quote/quoteVersionService";
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

  if (!opportunity.quote) {
    return NextResponse.json(
      { error: { code: "QUOTE_NOT_FOUND", message: "No quote exists yet for this opportunity." } },
      { status: 404 }
    );
  }

  const versions = opportunity.quote.versions;
  const current = getCurrentVersion(versions);

  if (!current) {
    return NextResponse.json(
      { error: { code: "QUOTE_NOT_FOUND", message: "No submitted quote exists yet to revise." } },
      { status: 404 }
    );
  }

  if (getDraftVersion(versions)) {
    return NextResponse.json(
      {
        error: {
          code: "QUOTE_REVISION_IN_PROGRESS",
          message: "A revision is already in progress for this quote.",
        },
      },
      { status: 409 }
    );
  }

  const newVersionNumber = nextVersionNumber(versions);

  const newDraft = await prisma.$transaction(async (tx) => {
    const created = await tx.quoteVersion.create({
      data: {
        quoteId: opportunity.quote!.id,
        versionNumber: newVersionNumber,
        status: "DRAFT",
        availabilityState: current.availabilityState,
        validUntil: current.validUntil,
        notes: current.notes,
        included: current.included,
        excluded: current.excluded,
      },
    });

    if (current.lineItems.length > 0) {
      await tx.quoteLineItem.createMany({
        data: current.lineItems.map((item) => ({
          quoteVersionId: created.id,
          label: item.label,
          amount: item.amount,
          order: item.order,
        })),
      });
    }

    return tx.quoteVersion.findUniqueOrThrow({
      where: { id: created.id },
      include: { lineItems: { orderBy: { order: "asc" } } },
    });
  });

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: "VENDOR_QUOTE_REVISION_STARTED",
    metadata: { newVersionNumber },
  });

  return NextResponse.json(
    {
      id: newDraft.id,
      status: newDraft.status,
      versionNumber: newDraft.versionNumber,
      availabilityState: newDraft.availabilityState,
      validUntil: newDraft.validUntil,
      notes: newDraft.notes,
      included: newDraft.included,
      excluded: newDraft.excluded,
      lineItems: newDraft.lineItems.map((item) => ({ label: item.label, amount: item.amount })),
    },
    { status: 201 }
  );
}
