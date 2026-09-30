/**
 * MuggedMoments — PATCH /api/vendor/opportunities/[opportunityId]/quote (Stage 18, Phase 18.1/18.4)
 *
 * Session-gated, ownership-checked. Saves/updates a DRAFT QuoteVersion. A vendor can
 * only start building a quote once they've said INTERESTED; once the current version
 * is SUBMITTED, this route rejects further edits — a vendor must explicitly call
 * .../quote/revise first (Stage 18, Phase 18.4) to open a new draft version. This
 * route never silently starts a revision itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { QuoteDraftPatchSchema } from "@/lib/validation/schemas";
import { getVendorSession } from "@/lib/vendorSession";
import { nextStatus } from "@/domain/opportunity/opportunityService";
import { getCurrentVersion, getDraftVersion } from "@/domain/quote/quoteVersionService";
import { calculateTotal } from "@/domain/quote/quoteService";
import { createAuditLog } from "@/domain/audit/auditService";
import prisma from "@/lib/db/prisma";

export async function PATCH(
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

  const parseResult = QuoteDraftPatchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please correct the highlighted fields." } },
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

  // Widened from Phase 18.1: QUOTE_SUBMITTED is now a legitimate state to be
  // revising from — whether there's anything editable is decided by the draft
  // lookup below, not by the opportunity's own status.
  if (
    opportunity.status !== "INTERESTED" &&
    opportunity.status !== "QUOTE_PENDING" &&
    opportunity.status !== "QUOTE_SUBMITTED"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_OPPORTUNITY_TRANSITION",
          message: "You can only build a quote for an opportunity you've marked as interested.",
        },
      },
      { status: 422 }
    );
  }

  const existingVersions = opportunity.quote?.versions ?? [];
  let draft = getDraftVersion(existingVersions);

  // No Quote row exists at all — this is the very first save ever for this
  // opportunity. Auto-create the Quote wrapper + its first DRAFT version (version 1),
  // exactly like Phase 18.1's original first-save behavior. This is the ONLY case
  // where a draft is created implicitly by PATCH — once a quote has ever existed,
  // a missing draft always means "already submitted, call .../quote/revise first."
  if (!opportunity.quote) {
    const created = await prisma.$transaction(async (tx) => {
      const newQuote = await tx.quote.create({ data: { opportunityId: opportunity.id } });
      return tx.quoteVersion.create({
        data: { quoteId: newQuote.id, versionNumber: 1, status: "DRAFT" },
      });
    });
    draft = created;
  }

  if (!draft) {
    // A Quote row exists but has no DRAFT version — the current version is
    // SUBMITTED and no revision has been started. The vendor must explicitly call
    // .../quote/revise first; this route never silently opens a new version.
    return NextResponse.json(
      { error: { code: "QUOTE_ALREADY_SUBMITTED", message: "This quote has already been submitted." } },
      { status: 409 }
    );
  }

  const { lineItems, availabilityState, validUntil, notes, included, excluded } = parseResult.data;

  const wasInterested = opportunity.status === "INTERESTED";

  const updatedVersion = await prisma.$transaction(async (tx) => {
    await tx.quoteVersion.update({
      where: { id: draft.id },
      data: {
        ...(availabilityState !== undefined ? { availabilityState } : {}),
        ...(validUntil !== undefined ? { validUntil: new Date(validUntil) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(included !== undefined ? { included } : {}),
        ...(excluded !== undefined ? { excluded } : {}),
      },
    });

    if (lineItems !== undefined) {
      await tx.quoteLineItem.deleteMany({ where: { quoteVersionId: draft.id } });
      if (lineItems.length > 0) {
        await tx.quoteLineItem.createMany({
          data: lineItems.map((item, index) => ({
            quoteVersionId: draft.id,
            label: item.label,
            amount: item.amount,
            order: index,
          })),
        });
      }
    }

    return tx.quoteVersion.findUniqueOrThrow({
      where: { id: draft.id },
      include: { lineItems: { orderBy: { order: "asc" } } },
    });
  });

  if (wasInterested) {
    const resultingStatus = nextStatus("INTERESTED", "START_QUOTE");
    if (resultingStatus) {
      await prisma.vendorOpportunity.update({
        where: { id: opportunity.id },
        data: { status: resultingStatus },
      });

      await createAuditLog({
        entityType: "VendorOpportunity",
        entityId: opportunity.id,
        action: "VENDOR_QUOTE_DRAFT_STARTED",
      });
    }
  }

  return NextResponse.json(
    {
      id: updatedVersion.id,
      status: updatedVersion.status,
      versionNumber: updatedVersion.versionNumber,
      availabilityState: updatedVersion.availabilityState,
      validUntil: updatedVersion.validUntil,
      notes: updatedVersion.notes,
      included: updatedVersion.included,
      excluded: updatedVersion.excluded,
      lineItems: updatedVersion.lineItems.map((item) => ({ label: item.label, amount: item.amount })),
      total: calculateTotal(updatedVersion.lineItems),
    },
    { status: 200 }
  );
}

/**
 * DELETE /api/vendor/opportunities/[opportunityId]/quote — discards an
 * in-progress revision (a DRAFT opened via .../quote/revise).
 *
 * Fixes a real gap: once a vendor started a revision, there was previously no
 * way back — getDraftVersion() always finds that draft, so .../quote/revise
 * permanently 409s ("a revision is already in progress"), and the only way
 * forward was to submit the draft even if the vendor changed their mind about
 * revising at all. Deleting the draft (cascades to its line items via the
 * schema's onDelete: Cascade) reverts the quote to its prior SUBMITTED version
 * exactly as it was.
 *
 * Deliberately refuses to delete a vendor's very first, never-submitted draft
 * (versionNumber 1 with no prior submitted version to fall back to) — that
 * isn't "abandoning a revision," it's their only quote, and this route is not
 * a general-purpose quote-deletion endpoint. That draft stays freely editable
 * via PATCH instead; nothing about it is ever locked before a first submission.
 */
export async function DELETE(
  _request: NextRequest,
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
    include: { quote: { include: { versions: true } } },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "OPPORTUNITY_NOT_FOUND", message: "Opportunity not found." } },
      { status: 404 }
    );
  }

  const versions = opportunity.quote?.versions ?? [];
  const draft = getDraftVersion(versions);

  if (!draft) {
    return NextResponse.json(
      { error: { code: "QUOTE_NOT_FOUND", message: "No draft revision is in progress." } },
      { status: 404 }
    );
  }

  const priorSubmitted = getCurrentVersion(versions.filter((v) => v.id !== draft.id));

  if (!priorSubmitted) {
    return NextResponse.json(
      {
        error: {
          code: "CANNOT_DISCARD_ONLY_VERSION",
          message: "This is your only quote version and can't be discarded — edit or submit it instead.",
        },
      },
      { status: 409 }
    );
  }

  await prisma.quoteVersion.delete({ where: { id: draft.id } });

  await createAuditLog({
    entityType: "VendorOpportunity",
    entityId: opportunity.id,
    action: "VENDOR_QUOTE_REVISION_DISCARDED",
    metadata: { discardedVersionNumber: draft.versionNumber },
  });

  return NextResponse.json(
    { versionNumber: priorSubmitted.versionNumber, status: priorSubmitted.status },
    { status: 200 }
  );
}
