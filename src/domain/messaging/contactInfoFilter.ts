/**
 * MuggedMoments — Contact Info Filter (in-app message content)
 *
 * Deterministic, pure regex-based detection. No AI, no external service —
 * same discipline as every other domain function in this codebase.
 *
 * Fixes a real gap: the vendor-anonymization work (see vendorDisplayName.ts)
 * hides vendor identity across every customer-facing surface, but none of
 * that matters if either party can simply TYPE a phone number or email into
 * the in-app message thread and arrange to continue the relationship off
 * platform. This is the same problem real marketplaces (Upwork, Fiverr,
 * Thumbtack) solve by blocking contact-info sharing in chat — the goal
 * stated explicitly: every customer/vendor interaction happens THROUGH this
 * platform.
 *
 * POLICY: block, never silently redact. A message silently altered without
 * telling the sender would be its own kind of dishonesty this codebase has
 * avoided everywhere else (see e.g. MatchList.tsx's "never silently
 * misrepresent" discipline). The sender gets a clear reason and can rephrase
 * — nothing is ever sent half-changed from what they typed.
 *
 * Deliberately conservative in scope: only phone numbers and email addresses
 * are detected — the two channels that actually let someone "call me
 * directly." Social handles (@username) are NOT matched; wedding-planning
 * messages legitimately reference numbers (guest counts, budgets, dates) far
 * more often than social handles, so adding handle-detection would raise
 * false positives without closing a materially different risk. This can be
 * extended later if a real need shows up — not preemptively.
 */

// Indian mobile numbers: optional +91/91 prefix, then a 10-digit number
// starting 6-9 (the valid Indian mobile prefix range). Each of the remaining
// 9 digits may have an optional space/dot/dash immediately before it, so this
// matches every common way someone actually types one — run together
// ("9876543210"), the common 5-5 grouping ("98765 43210"), 3-3-4
// ("987-654-3210"), or anything in between — without hardcoding one specific
// grouping. A letter anywhere in the run breaks the match, so ordinary prose
// numbers ("2000 guests", "budget is 500000") never trigger this: they're
// either too short or surrounded by non-digit, non-separator characters.
const PHONE_PATTERN = /(?:\+?91[\s.-]?)?[6-9](?:[\s.-]?\d){9}\b/;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export type ContactInfoMatch = "PHONE_NUMBER" | "EMAIL_ADDRESS";

/**
 * Returns which kind of contact info was found in the text, or null if none.
 * Checks email first — an email match is unambiguous, whereas the phone
 * pattern is the one with any (small, intentional) false-positive surface.
 */
export function detectContactInfo(text: string): ContactInfoMatch | null {
  if (EMAIL_PATTERN.test(text)) return "EMAIL_ADDRESS";
  if (PHONE_PATTERN.test(text)) return "PHONE_NUMBER";
  return null;
}

export const CONTACT_INFO_BLOCKED_MESSAGE =
  "For your safety, phone numbers and email addresses can't be shared in messages — please keep all communication through MuggedMoments so we can help if anything goes wrong.";
