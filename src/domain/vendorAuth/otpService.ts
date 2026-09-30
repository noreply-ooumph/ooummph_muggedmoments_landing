/**
 * MuggedMoments — Vendor Session Token Hashing
 *
 * The vendor login flow no longer uses OTP verification (removed per explicit
 * request — vendor login/registration is now phone-number-only, no code sent or
 * checked; see src/app/api/vendor/login/route.ts and
 * src/app/api/vendor/register/route.ts). This file is kept only because
 * hashSessionToken() is a general session-token hashing utility used by
 * lib/vendorSession/index.ts — unrelated to OTP itself, just historically
 * co-located here. Not renamed/moved to avoid an unnecessary import-path churn
 * across the one file that uses it.
 *
 * Removed from this file (previously here, deleted along with the OTP flow):
 * generateOtpCode, isOtpValid, isRecentlyVerified, getOtpExpiryDate, MAX_OTP_ATTEMPTS.
 * The VendorOtpCode Prisma model/table and its migration are intentionally left
 * in place, unused — dropping a table is a separate, more destructive action
 * than removing the code that used it; ask if you also want that migration.
 */

import { createHash } from "crypto";

/**
 * Hashes an opaque session token for storage — the raw token is never persisted,
 * only its hash, so a database read alone cannot be used to impersonate a session.
 */
export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
