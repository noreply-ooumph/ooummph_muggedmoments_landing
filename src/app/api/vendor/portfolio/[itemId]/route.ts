/**
 * MuggedMoments — DELETE /api/vendor/portfolio/[itemId] (Stage 16, Phase 2)
 *
 * Session-gated, ownership-checked. Returns 404 (not 403) when the item belongs to
 * a different vendor — never confirms to a caller that an item exists under an
 * account that isn't theirs.
 */

import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const { itemId } = await params;

  const item = await prisma.vendorPortfolioItem.findUnique({ where: { id: itemId } });

  if (!item || item.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "PORTFOLIO_ITEM_NOT_FOUND", message: "Portfolio item not found." } },
      { status: 404 }
    );
  }

  await prisma.vendorPortfolioItem.delete({ where: { id: item.id } });

  try {
    const absoluteFilePath = path.join(process.cwd(), "public", item.imagePath.replace(/^\//, ""));
    await unlink(absoluteFilePath);
  } catch (error) {
    logger.warn("Failed to delete portfolio file from disk (DB row already removed)", {
      operation: "DELETE /api/vendor/portfolio/[itemId]",
      errorCode: "PORTFOLIO_FILE_DELETE_FAILED",
    });
  }

  await createAuditLog({
    entityType: "Vendor",
    entityId: session.vendorId,
    action: "VENDOR_PORTFOLIO_ITEM_REMOVED",
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
