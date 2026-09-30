/**
 * MuggedMoments — Vendor Phone Lookup (shared by login + register)
 *
 * Fixes a real gap: POST /api/vendor/login and POST /api/vendor/register both
 * used to look vendors up by an EXACT string match on Vendor.contactPhone.
 * Vendor.contactPhone is stored exactly as typed at registration, with no
 * normalization — the same person could plausibly register with
 * "+91 98765 43210" and later type "9876543210" to log back in (or vice
 * versa). An exact match would then report "no vendor found," pushing them
 * into registration and silently creating a second, disconnected vendor
 * account under the same real phone number — splitting their opportunities,
 * verification status, and profile across two accounts with no way to merge
 * them back.
 *
 * This mirrors getLeadSummariesByPhone()'s exact reasoning and technique in
 * leadService.ts (same shared normalizePhoneLast10() from @/lib/phone) — an
 * exact match is tried first (cheap, covers the common case), falling back to
 * a normalized scan across all vendors only on a miss.
 */

import prisma from "@/lib/db/prisma";
import { normalizePhoneLast10 } from "@/lib/phone";
import type { Vendor } from "@prisma/client";

export async function findVendorByPhone(phone: string): Promise<Vendor | null> {
  const exact = await prisma.vendor.findUnique({ where: { contactPhone: phone } });
  if (exact) return exact;

  const target = normalizePhoneLast10(phone);
  if (target.length !== 10) return null;

  const candidates = await prisma.vendor.findMany({
    where: { contactPhone: { not: null } },
    select: { id: true, contactPhone: true },
  });
  const match = candidates.find(
    (c) => c.contactPhone && normalizePhoneLast10(c.contactPhone) === target
  );
  if (!match) return null;

  return prisma.vendor.findUnique({ where: { id: match.id } });
}
