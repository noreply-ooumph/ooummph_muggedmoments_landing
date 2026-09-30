/**
 * MuggedMoments — POST /api/vendor/portfolio (Stage 16, Phase 2)
 *
 * Uploads one portfolio image via native Next.js formData() — no upload library.
 * Local disk storage under public/uploads/vendor-portfolio/<vendorId>/ — a known,
 * documented limitation: this does not survive redeploys on ephemeral filesystems.
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import { toApiErrorResponse } from "@/lib/errors";
import {
  isAllowedPortfolioMimeType,
  isWithinPortfolioFileSizeLimit,
  isUnderPortfolioItemLimit,
  buildPortfolioImagePath,
} from "@/domain/vendorProfile/portfolioService";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid form data." } },
      { status: 422 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please attach an image file." } },
      { status: 422 }
    );
  }

  if (!isAllowedPortfolioMimeType(file.type)) {
    return NextResponse.json(
      { error: { code: "INVALID_FILE_TYPE", message: "Only JPEG, PNG, and WEBP images are allowed." } },
      { status: 422 }
    );
  }

  if (!isWithinPortfolioFileSizeLimit(file.size)) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Image must be 5MB or smaller." } },
      { status: 422 }
    );
  }

  const existingCount = await prisma.vendorPortfolioItem.count({
    where: { vendorId: session.vendorId },
  });

  if (!isUnderPortfolioItemLimit(existingCount)) {
    return NextResponse.json(
      {
        error: {
          code: "PORTFOLIO_LIMIT_REACHED",
          message: "You've reached the maximum of 12 portfolio images. Remove one to add another.",
        },
      },
      { status: 409 }
    );
  }

  const fileId = uuidv4();
  const imagePath = buildPortfolioImagePath(session.vendorId, fileId, file.type);
  const absoluteDir = path.join(process.cwd(), "public", "uploads", "vendor-portfolio", session.vendorId);
  const absoluteFilePath = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));

  let fileWritten = false;
  try {
    await mkdir(absoluteDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absoluteFilePath, buffer);
    fileWritten = true;

    const item = await prisma.vendorPortfolioItem.create({
      data: { vendorId: session.vendorId, imagePath },
    });

    await createAuditLog({
      entityType: "Vendor",
      entityId: session.vendorId,
      action: "VENDOR_PORTFOLIO_ITEM_ADDED",
    });

    return NextResponse.json(
      { id: item.id, imagePath: item.imagePath, createdAt: item.createdAt },
      { status: 201 }
    );
  } catch (error) {
    if (fileWritten) {
      try {
        await unlink(absoluteFilePath);
      } catch (cleanupError) {
        logger.warn("Failed to clean up orphaned portfolio file after DB write failure", {
          operation: "POST /api/vendor/portfolio",
          errorCode: "PORTFOLIO_CLEANUP_FAILED",
        });
      }
    }
    logger.error("Failed to upload vendor portfolio item", {
      operation: "POST /api/vendor/portfolio",
      errorCode: "PORTFOLIO_UPLOAD_FAILED",
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
