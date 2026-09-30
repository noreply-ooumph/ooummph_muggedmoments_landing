/**
 * MuggedMoments — Vendor Portfolio Domain Logic (Stage 16, Phase 2)
 *
 * Deterministic, pure. No AI, no I/O — same discipline as vendorAuth/otpService.ts
 * and vendorProfile/vendorProfileService.ts. Actual disk/DB I/O stays in the routes.
 */

export const ALLOWED_PORTFOLIO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedPortfolioMimeType = (typeof ALLOWED_PORTFOLIO_MIME_TYPES)[number];

export const MAX_PORTFOLIO_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const MAX_PORTFOLIO_ITEMS_PER_VENDOR = 12;

const MIME_TO_EXTENSION: Record<AllowedPortfolioMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function isAllowedPortfolioMimeType(
  mimeType: string
): mimeType is AllowedPortfolioMimeType {
  return (ALLOWED_PORTFOLIO_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isWithinPortfolioFileSizeLimit(sizeBytes: number): boolean {
  return sizeBytes <= MAX_PORTFOLIO_FILE_SIZE_BYTES;
}

export function isUnderPortfolioItemLimit(currentItemCount: number): boolean {
  return currentItemCount < MAX_PORTFOLIO_ITEMS_PER_VENDOR;
}

/**
 * Maps a validated MIME type to its on-disk extension. Never derive the extension
 * from a client-supplied filename — only from the MIME type we've already validated.
 */
export function extensionForMimeType(mimeType: AllowedPortfolioMimeType): string {
  return MIME_TO_EXTENSION[mimeType];
}

/**
 * Builds the relative, host-agnostic public path for a portfolio image.
 * vendorId and fileId are both UUIDs generated server-side — never derived from
 * client input — so this can never produce a path-traversal-unsafe segment.
 */
export function buildPortfolioImagePath(
  vendorId: string,
  fileId: string,
  mimeType: AllowedPortfolioMimeType
): string {
  return `/uploads/vendor-portfolio/${vendorId}/${fileId}${extensionForMimeType(mimeType)}`;
}
