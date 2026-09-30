/**
 * MuggedMoments — POST /api/vendor/documents (Brochure upload)
 *
 * Uploads one vendor brochure (PDF) via native Next.js formData() — no upload
 * library, same pattern as /api/vendor/portfolio/route.ts. Storage goes through
 * fileStorage (src/lib/fileStorage) — Vercel Blob when BLOB_READ_WRITE_TOKEN is
 * set, local disk otherwise. Confirmed live in production: local disk alone
 * does not survive Vercel's read-only runtime filesystem.
 *
 * PRIVACY SCAN: before the file is ever written to disk, its PDF text layer is
 * extracted (unpdf) and run through the same detectContactInfo() the in-app
 * message thread uses (contactInfoFilter.ts) — a phone number or email printed in
 * a brochure's text is exactly the kind of off-platform contact channel the vendor-
 * anonymization and message-filter work already blocks elsewhere; a brochure would
 * otherwise be a trivial bypass of both. Same "block, never silently alter" policy:
 * the vendor gets a clear reason and can re-upload an edited PDF, nothing is ever
 * silently stripped from their file.
 *
 * SCOPE NOTE: this only reads the PDF's embedded text layer, not a scanned/image-only
 * page (that would require OCR, deliberately out of scope for this pass — see
 * documentService.ts header comment). Most real brochures (exported from Canva,
 * Word, Google Docs, Photoshop "Save as PDF", etc.) have a real text layer.
 *
 * LIBRARY NOTE: not the "pdf-parse" package — its current major version (v2)
 * spawns a pdfjs-dist worker thread whose script it resolves relative to its own
 * bundled location, which breaks once Turbopack repackages this route into a
 * single server chunk (the worker .mjs becomes an unreachable separate asset).
 * Its old v1.1.1 avoids workers but bundles an 8-year-old pdf.js that proved
 * unreliable in testing (intermittent "bad XRef entry" errors on valid PDFs,
 * apparently from shared parser state across calls in the same process — see
 * this session's verification notes). unpdf is built specifically for
 * serverless/bundled runtimes (Vercel, Cloudflare Workers, Next.js route
 * handlers) and ships its own worker-free PDF.js build for exactly this reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { extractText, getDocumentProxy } from "unpdf";
import { getVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import { toApiErrorResponse } from "@/lib/errors";
import { fileStorage } from "@/lib/fileStorage";
import { detectContactInfo } from "@/domain/messaging/contactInfoFilter";
import {
  isAllowedDocumentMimeType,
  isWithinDocumentFileSizeLimit,
  isUnderDocumentLimit,
  buildDocumentPath,
  sanitizeOriginalFilename,
} from "@/domain/vendorProfile/documentService";
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
      { error: { code: "VALIDATION_ERROR", message: "Please attach a PDF file." } },
      { status: 422 }
    );
  }

  if (!isAllowedDocumentMimeType(file.type)) {
    return NextResponse.json(
      { error: { code: "INVALID_FILE_TYPE", message: "Only PDF documents are allowed." } },
      { status: 422 }
    );
  }

  if (!isWithinDocumentFileSizeLimit(file.size)) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Document must be 10MB or smaller." } },
      { status: 422 }
    );
  }

  const existingCount = await prisma.vendorDocument.count({
    where: { vendorId: session.vendorId },
  });

  if (!isUnderDocumentLimit(existingCount)) {
    return NextResponse.json(
      {
        error: {
          code: "DOCUMENT_LIMIT_REACHED",
          message: "You've reached the maximum of 3 documents. Remove one to add another.",
        },
      },
      { status: 409 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extractedText = "";
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    extractedText = text ?? "";
  } catch (pdfError) {
    logger.error("Failed to parse uploaded PDF for content scan", {
      operation: "POST /api/vendor/documents",
      errorCode: "PDF_PARSE_FAILED",
      message: pdfError instanceof Error ? pdfError.message : String(pdfError),
      stack: pdfError instanceof Error ? pdfError.stack : undefined,
    });
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PDF",
          message: "This file couldn't be read as a PDF. Please check the file and try again.",
        },
      },
      { status: 422 }
    );
  }

  const contactInfoMatch = detectContactInfo(extractedText);
  if (contactInfoMatch) {
    return NextResponse.json(
      {
        error: {
          code: "CONTACT_INFO_NOT_ALLOWED",
          message:
            "For your safety, phone numbers and email addresses can't be included in uploaded documents — please remove that and re-upload, so all communication stays through MuggedMoments.",
        },
      },
      { status: 422 }
    );
  }

  const fileId = uuidv4();
  const relativePath = buildDocumentPath(session.vendorId, fileId, file.type);

  let uploadedPath: string | null = null;
  try {
    uploadedPath = await fileStorage.upload({
      buffer,
      relativePath,
      contentType: file.type,
    });

    const document = await prisma.vendorDocument.create({
      data: {
        vendorId: session.vendorId,
        filePath: uploadedPath,
        originalFilename: sanitizeOriginalFilename(file.name),
        fileSizeBytes: file.size,
      },
    });

    await createAuditLog({
      entityType: "Vendor",
      entityId: session.vendorId,
      action: "VENDOR_DOCUMENT_ADDED",
    });

    return NextResponse.json(
      {
        id: document.id,
        filePath: document.filePath,
        originalFilename: document.originalFilename,
        fileSizeBytes: document.fileSizeBytes,
        createdAt: document.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (uploadedPath) {
      try {
        await fileStorage.delete(uploadedPath);
      } catch {
        logger.warn("Failed to clean up orphaned document file after DB write failure", {
          operation: "POST /api/vendor/documents",
          errorCode: "DOCUMENT_CLEANUP_FAILED",
        });
      }
    }
    logger.error("Failed to upload vendor document", {
      operation: "POST /api/vendor/documents",
      errorCode: "DOCUMENT_UPLOAD_FAILED",
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
