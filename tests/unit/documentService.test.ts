/**
 * MuggedMoments — Unit Tests: Vendor Document/Brochure Domain Logic
 */

import { describe, it, expect } from "vitest";
import {
  isAllowedDocumentMimeType,
  isWithinDocumentFileSizeLimit,
  isUnderDocumentLimit,
  extensionForDocumentMimeType,
  buildDocumentPath,
  sanitizeOriginalFilename,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENTS_PER_VENDOR,
  MAX_ORIGINAL_FILENAME_LENGTH,
} from "@/domain/vendorProfile/documentService";

describe("Document Service — isAllowedDocumentMimeType", () => {
  it("accepts application/pdf", () => {
    expect(isAllowedDocumentMimeType("application/pdf")).toBe(true);
  });

  it("rejects an image mime type — this is documents-only, images stay on the portfolio route", () => {
    expect(isAllowedDocumentMimeType("image/jpeg")).toBe(false);
  });

  it("rejects a disallowed mime type", () => {
    expect(isAllowedDocumentMimeType("text/plain")).toBe(false);
  });
});

describe("Document Service — isWithinDocumentFileSizeLimit", () => {
  it("accepts a file exactly at the 10MB boundary", () => {
    expect(isWithinDocumentFileSizeLimit(MAX_DOCUMENT_FILE_SIZE_BYTES)).toBe(true);
  });

  it("rejects a file one byte over the boundary", () => {
    expect(isWithinDocumentFileSizeLimit(MAX_DOCUMENT_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  it("accepts a small file", () => {
    expect(isWithinDocumentFileSizeLimit(1024)).toBe(true);
  });
});

describe("Document Service — isUnderDocumentLimit", () => {
  it("is true below the cap", () => {
    expect(isUnderDocumentLimit(MAX_DOCUMENTS_PER_VENDOR - 1)).toBe(true);
  });

  it("is false at the cap", () => {
    expect(isUnderDocumentLimit(MAX_DOCUMENTS_PER_VENDOR)).toBe(false);
  });

  it("is false above the cap", () => {
    expect(isUnderDocumentLimit(MAX_DOCUMENTS_PER_VENDOR + 1)).toBe(false);
  });
});

describe("Document Service — extensionForDocumentMimeType", () => {
  it("maps application/pdf to .pdf", () => {
    expect(extensionForDocumentMimeType("application/pdf")).toBe(".pdf");
  });
});

describe("Document Service — buildDocumentPath", () => {
  it("builds a host-agnostic relative path with no traversal-unsafe segments", () => {
    const path = buildDocumentPath("vendor-uuid-123", "file-uuid-456", "application/pdf");
    expect(path).toBe("/uploads/vendor-documents/vendor-uuid-123/file-uuid-456.pdf");
    expect(path).not.toContain("..");
    expect(path).not.toContain("http");
  });
});

describe("Document Service — sanitizeOriginalFilename", () => {
  it("leaves a normal filename unchanged", () => {
    expect(sanitizeOriginalFilename("brochure.pdf")).toBe("brochure.pdf");
  });

  it("truncates a pathologically long filename to the max length", () => {
    const longName = "a".repeat(MAX_ORIGINAL_FILENAME_LENGTH + 50) + ".pdf";
    const result = sanitizeOriginalFilename(longName);
    expect(result.length).toBe(MAX_ORIGINAL_FILENAME_LENGTH);
  });
});
