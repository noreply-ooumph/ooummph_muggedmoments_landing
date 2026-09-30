/**
 * MuggedMoments — DELETE /api/vendor/documents/[documentId]
 *
 * Session-gated, ownership-checked — same pattern as
 * /api/vendor/portfolio/[itemId]/route.ts. Returns 404 (not 403) when the document
 * belongs to a different vendor — never confirms to a caller that a document exists
 * under an account that isn't theirs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import { fileStorage } from "@/lib/fileStorage";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const { documentId } = await params;

  const document = await prisma.vendorDocument.findUnique({ where: { id: documentId } });

  if (!document || document.vendorId !== session.vendorId) {
    return NextResponse.json(
      { error: { code: "DOCUMENT_NOT_FOUND", message: "Document not found." } },
      { status: 404 }
    );
  }

  await prisma.vendorDocument.delete({ where: { id: document.id } });

  try {
    await fileStorage.delete(document.filePath);
  } catch {
    logger.warn("Failed to delete document file from storage (DB row already removed)", {
      operation: "DELETE /api/vendor/documents/[documentId]",
      errorCode: "DOCUMENT_FILE_DELETE_FAILED",
    });
  }

  await createAuditLog({
    entityType: "Vendor",
    entityId: session.vendorId,
    action: "VENDOR_DOCUMENT_REMOVED",
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
