/**
 * MuggedMoments — Anonymous Session ID (Stage 14)
 *
 * localStorage-backed identifier so pre-lead analytics events (page_view, form_start,
 * etc.) can later be joined to the lead they eventually produced, once that lead's
 * "lead_created" event carries the same anonymousId. Structurally identical to
 * generateIdempotencyKey() in @/lib/idempotency — same pattern, separate file, since
 * that file is not otherwise touched by this change.
 */

import { v4 as uuidv4 } from "uuid";

const ANONYMOUS_ID_KEY = "mm_anonymous_id";

/**
 * Returns the current session's anonymous ID, creating and persisting one if none
 * exists yet. Client-side only — returns undefined on the server or if localStorage
 * is unavailable, matching this codebase's existing "degrade silently" convention for
 * browser storage (see useFormState.ts's saveFormState/loadFormState).
 */
export function getOrCreateAnonymousId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;

    const fresh = uuidv4();
    localStorage.setItem(ANONYMOUS_ID_KEY, fresh);
    return fresh;
  } catch {
    return undefined;
  }
}
