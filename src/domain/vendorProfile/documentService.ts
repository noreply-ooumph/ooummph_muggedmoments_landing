/**
 * MuggedMoments — Vendor Document/Brochure Domain Logic
 *
 * Deterministic, pure. No AI, no I/O — same discipline as portfolioService.ts,
 * which this file mirrors exactly (MIME/size/count validation, server-generated
 * UUID file paths). Actual disk/DB I/O and the content-privacy scan stay in the
 * route (the scan needs pdf-parse, an I/O-adjacent library, not pure domain logic).
 *
 * Scoped to PDF only, not a general file-drop — this is specifically a "brochure"
 * upload so a vendor doesn't have to re-type every detail into each quote, not an
 * arbitrary document store.
 */

export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const MAX_DOCUMENTS_PER_VENDOR = 3;

const MIME_TO_EXTENSION: Record<AllowedDocumentMimeType, string> = {
  "application/pdf": ".pdf",
};

export function isAllowedDocumentMimeType(
  mimeType: string
): mimeType is AllowedDocumentMimeType {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isWithinDocumentFileSizeLimit(sizeBytes: number): boolean {
  return sizeBytes <= MAX_DOCUMENT_FILE_SIZE_BYTES;
}

export function isUnderDocumentLimit(currentDocumentCount: number): boolean {
  return currentDocumentCount < MAX_DOCUMENTS_PER_VENDOR;
}

/**
 * Maps a validated MIME type to its on-disk extension. Never derive the extension
 * from a client-supplied filename — only from the MIME type we've already validated.
 */
export function extensionForDocumentMimeType(mimeType: AllowedDocumentMimeType): string {
  return MIME_TO_EXTENSION[mimeType];
}

/**
 * Builds the relative, host-agnostic public path for a vendor document.
 * vendorId and fileId are both UUIDs generated server-side — never derived from
 * client input — so this can never produce a path-traversal-unsafe segment.
 */
export function buildDocumentPath(
  vendorId: string,
  fileId: string,
  mimeType: AllowedDocumentMimeType
): string {
  return `/uploads/vendor-documents/${vendorId}/${fileId}${extensionForDocumentMimeType(mimeType)}`;
}

/**
 * A client-supplied original filename is display-only, never used to build a path
 * or trusted for content-type. Still worth capping length so a pathological input
 * can't bloat storage/rendering — same non-trust posture as everywhere else client
 * input touches this codebase.
 */
export const MAX_ORIGINAL_FILENAME_LENGTH = 200;

export function sanitizeOriginalFilename(filename: string): string {
  return filename.slice(0, MAX_ORIGINAL_FILENAME_LENGTH);
}
