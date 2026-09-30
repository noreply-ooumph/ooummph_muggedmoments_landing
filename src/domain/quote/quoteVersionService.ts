/**
 * MuggedMoments — Quote Version Domain Logic (Stage 18, Phase 18.4)
 *
 * Deterministic, pure. No AI, no I/O — same discipline as opportunityService.ts.
 *
 * "Current version" is always derived, never stored — the highest-versionNumber
 * SUBMITTED version. There is no currentVersionId pointer column anywhere in the
 * schema; this function is the single source of truth for "which version is live."
 */

export interface QuoteVersionLike {
  id: string;
  versionNumber: number;
  status: "DRAFT" | "SUBMITTED";
}

export function getCurrentVersion<T extends QuoteVersionLike>(versions: T[]): T | null {
  const submitted = versions.filter((v) => v.status === "SUBMITTED");
  if (submitted.length === 0) return null;
  return submitted.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
}

export function getDraftVersion<T extends QuoteVersionLike>(versions: T[]): T | null {
  return versions.find((v) => v.status === "DRAFT") ?? null;
}

export function nextVersionNumber(versions: QuoteVersionLike[]): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
}
