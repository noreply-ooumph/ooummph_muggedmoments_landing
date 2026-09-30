/**
 * MuggedMoments — Availability Domain Service
 *
 * CRITICAL RULE: UNKNOWN != AVAILABLE
 *
 * If availability information does not exist for a vendor on a date:
 * - Do NOT claim the vendor is available
 * - Return UNKNOWN
 * - Never silently promote UNKNOWN to AVAILABLE
 *
 * Availability states:
 * - AVAILABLE: vendor has explicitly confirmed availability
 * - UNAVAILABLE: vendor has explicitly marked as unavailable
 * - UNKNOWN: no availability data exists for this date
 */

import type { AvailabilityStatus } from "@/types";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { createAuditLog } from "@/domain/audit/auditService";

function normalizeToMidnightUTC(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Checks a single vendor's availability for a specific date.
 * Returns UNKNOWN if no availability record exists.
 * NEVER returns AVAILABLE for UNKNOWN state.
 */
export async function checkVendorAvailability(
  vendorId: string,
  date: Date
): Promise<AvailabilityStatus> {
  try {
    // Normalize date to midnight UTC for consistent lookup
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const record = await prisma.vendorAvailability.findUnique({
      where: {
        vendorId_date: {
          vendorId,
          date: normalizedDate,
        },
      },
    });

    if (!record) {
      // CRITICAL: No record = UNKNOWN, not AVAILABLE
      return "UNKNOWN";
    }

    // Return exactly what the record says — do not transform
    return record.status as AvailabilityStatus;
  } catch (error) {
    logger.error("Failed to check vendor availability", {
      operation: "checkVendorAvailability",
      vendorId,
      errorCode: "DATABASE_ERROR",
    });
    // On error, return UNKNOWN — never assume AVAILABLE
    return "UNKNOWN";
  }
}

/**
 * Checks availability for multiple vendors on a given date.
 * Returns a map of vendorId -> AvailabilityStatus.
 * All vendors without an availability record get UNKNOWN.
 */
export async function checkVendorsAvailability(
  vendorIds: string[],
  date: Date
): Promise<Map<string, AvailabilityStatus>> {
  const result = new Map<string, AvailabilityStatus>();

  if (vendorIds.length === 0) return result;

  try {
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const records = await prisma.vendorAvailability.findMany({
      where: {
        vendorId: { in: vendorIds },
        date: normalizedDate,
      },
      select: {
        vendorId: true,
        status: true,
      },
    });

    // Build a lookup from records
    const recordMap = new Map(records.map((r: { vendorId: string; status: string }) => [r.vendorId, r.status]));

    // For all requested vendors, return record status or UNKNOWN
    for (const vendorId of vendorIds) {
      const status = recordMap.get(vendorId);
      // CRITICAL: If no record, status is UNKNOWN — not AVAILABLE
      result.set(vendorId, (status ?? "UNKNOWN") as AvailabilityStatus);
    }
  } catch (error) {
    logger.error("Failed to check bulk vendor availability", {
      operation: "checkVendorsAvailability",
      errorCode: "DATABASE_ERROR",
    });
    // On error, all return UNKNOWN
    for (const vendorId of vendorIds) {
      result.set(vendorId, "UNKNOWN");
    }
  }

  return result;
}

/**
 * Live re-check of availability for a set of already-matched vendors against a
 * lead's event date. Used by the customer-facing status query to REFRESH the
 * displayed availability on every view, without touching the frozen
 * LeadVendorMatch.eligible/reasons snapshot — matching itself stays
 * point-in-time by design (see matchingService.ts's own header comment).
 *
 * Availability is different: it's an explicitly live, mutable fact a vendor
 * can update at any time via setVendorAvailability() above. Freezing it
 * forever at match-creation time would make that self-service feature
 * invisible to a customer checking their already-matched request — this is
 * the fix for exactly that: a vendor sets AVAILABLE/UNAVAILABLE for a date
 * after being matched, and the customer's next status-page view reflects it
 * immediately, with no re-matching involved.
 *
 * Mirrors runMatching()'s own guard: only checks when eventDate is known,
 * same reasoning as there (no date, nothing meaningful to check).
 */
export async function refreshMatchAvailability(
  vendorIds: string[],
  eventDate: Date | null
): Promise<Map<string, AvailabilityStatus>> {
  if (!eventDate || vendorIds.length === 0) return new Map();
  return checkVendorsAvailability(vendorIds, eventDate);
}

/**
 * Fixes the gap identified alongside the customer/admin lead-edit paths: until
 * now, VendorAvailability was ONLY ever written as a side effect of accepting
 * a booking request (see the accept route's `source: "BOOKING_ACCEPTED"`
 * write) — a vendor had no way to proactively declare a date they know
 * they're busy on. This is the write path for that: explicit, vendor-initiated,
 * distinct `source: "VENDOR_SELF_REPORTED"` so it's never confused with a
 * real booking commitment in the data.
 *
 * Only AVAILABLE/UNAVAILABLE are settable this way — UNKNOWN is the "no data"
 * resting state (see this file's header comment); a vendor clears a date back
 * to it via clearVendorAvailability() below rather than "setting" it directly.
 *
 * Refuses to overwrite a BOOKING_ACCEPTED-sourced row: that represents a real,
 * already-confirmed commitment to a customer, and this self-service path must
 * never silently override that fact, in either direction.
 */
export async function setVendorAvailability(
  vendorId: string,
  date: Date,
  status: Extract<AvailabilityStatus, "AVAILABLE" | "UNAVAILABLE">
): Promise<{ date: Date; status: AvailabilityStatus }> {
  const normalizedDate = normalizeToMidnightUTC(date);

  const existing = await prisma.vendorAvailability.findUnique({
    where: { vendorId_date: { vendorId, date: normalizedDate } },
  });

  if (existing?.source === "BOOKING_ACCEPTED") {
    throw new ValidationError(
      "This date already has a confirmed booking and can't be changed here."
    );
  }

  const record = await prisma.vendorAvailability.upsert({
    where: { vendorId_date: { vendorId, date: normalizedDate } },
    update: { status, source: "VENDOR_SELF_REPORTED" },
    create: { vendorId, date: normalizedDate, status, source: "VENDOR_SELF_REPORTED" },
  });

  await createAuditLog({
    entityType: "Vendor",
    entityId: vendorId,
    action: "VENDOR_AVAILABILITY_SET",
    actorType: "USER",
    metadata: { date: normalizedDate.toISOString(), status },
  });

  return { date: record.date, status: record.status as AvailabilityStatus };
}

/**
 * Clears a vendor's self-reported availability for a date back to UNKNOWN (no
 * data) — deletes the row rather than writing UNKNOWN, matching this file's
 * own rule that UNKNOWN represents the absence of a record, not a stored
 * value. Same BOOKING_ACCEPTED protection as setVendorAvailability() above:
 * a real confirmed booking can never be cleared through this path.
 */
export async function clearVendorAvailability(vendorId: string, date: Date): Promise<void> {
  const normalizedDate = normalizeToMidnightUTC(date);

  const existing = await prisma.vendorAvailability.findUnique({
    where: { vendorId_date: { vendorId, date: normalizedDate } },
  });

  if (!existing) return;

  if (existing.source === "BOOKING_ACCEPTED") {
    throw new ValidationError(
      "This date already has a confirmed booking and can't be cleared here."
    );
  }

  await prisma.vendorAvailability.delete({
    where: { vendorId_date: { vendorId, date: normalizedDate } },
  });

  await createAuditLog({
    entityType: "Vendor",
    entityId: vendorId,
    action: "VENDOR_AVAILABILITY_SET",
    actorType: "USER",
    metadata: { date: normalizedDate.toISOString(), status: "UNKNOWN" },
  });
}

/**
 * Lists a vendor's own self-reported + booking-derived availability rows from
 * today onward, oldest first — for rendering on their dashboard. Past dates
 * are excluded since they're no longer actionable.
 */
export async function listVendorAvailability(
  vendorId: string
): Promise<Array<{ date: Date; status: AvailabilityStatus; source: string | null }>> {
  const today = normalizeToMidnightUTC(new Date());

  const rows = await prisma.vendorAvailability.findMany({
    where: { vendorId, date: { gte: today } },
    orderBy: { date: "asc" },
    select: { date: true, status: true, source: true },
  });

  return rows.map((row) => ({
    date: row.date,
    status: row.status as AvailabilityStatus,
    source: row.source,
  }));
}
