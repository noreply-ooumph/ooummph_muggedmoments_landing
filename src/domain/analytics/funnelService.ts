/**
 * MuggedMoments — Funnel & Timeline Reporting (Stage 14)
 *
 * Read-only reporting over real, already-persisted data — AnalyticsEvent (Stage 14's
 * new event log) and AuditLog (the existing, richer lead-lifecycle trail; LeadEvent is
 * deliberately NOT used here since only one LeadEvent type — LEAD_CREATED — is ever
 * written anywhere in this codebase).
 *
 * Only stages this codebase actually has a real event or column for are implemented —
 * no "quote"/"booking" stage exists here because that concept does not exist anywhere
 * else in this codebase yet.
 */

import prisma from "@/lib/db/prisma";

export interface FunnelStageCount {
  stage: string;
  count: number;
}

export interface TimelineEntry {
  timestamp: string;
  source: "audit" | "analytics";
  label: string;
  metadata?: unknown;
}

/**
 * Pure helper — counts distinct visitor/lead identities from a set of event rows.
 * Prefers leadId (once known) over anonymousId, since the same visitor's pre-lead and
 * post-lead events should count once, not twice, from the moment the lead exists.
 * Extracted as a pure function (no I/O) specifically so it's unit-testable without a
 * database — this repo's test suite has no DB fixture/integration harness today.
 */
export function countDistinctIds(
  rows: Array<{ anonymousId: string | null; leadId: string | null }>
): number {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = row.leadId ?? row.anonymousId;
    if (id) ids.add(id);
  }
  return ids.size;
}

/**
 * Counts distinct visitors/leads for a given analytics event within a date range.
 */
async function countDistinctForEvent(
  event: string,
  range: { from: Date; to: Date }
): Promise<number> {
  const rows = await prisma.analyticsEvent.findMany({
    where: { event, createdAt: { gte: range.from, lte: range.to } },
    select: { anonymousId: true, leadId: true },
  });

  return countDistinctIds(rows);
}

export async function computeFunnelReport(range: {
  from: Date;
  to: Date;
}): Promise<FunnelStageCount[]> {
  const [pageView, formStart, formSubmitAttempt, leadCreated, qualified, routed] =
    await Promise.all([
      countDistinctForEvent("page_view", range),
      countDistinctForEvent("form_start", range),
      countDistinctForEvent("form_submit_attempt", range),
      countDistinctForEvent("lead_created", range),
      prisma.leadQualification.count({
        where: {
          status: "QUALIFIED",
          lead: { createdAt: { gte: range.from, lte: range.to } },
        },
      }),
      prisma.leadQualification.count({
        where: {
          status: "ROUTED",
          lead: { createdAt: { gte: range.from, lte: range.to } },
        },
      }),
    ]);

  return [
    { stage: "page_view", count: pageView },
    { stage: "form_start", count: formStart },
    { stage: "form_submit_attempt", count: formSubmitAttempt },
    { stage: "lead_created", count: leadCreated },
    { stage: "qualified", count: qualified },
    { stage: "routed", count: routed },
  ];
}

/**
 * Known limitation: only AnalyticsEvent rows that already carry this leadId are
 * included — events fired before the lead existed only have an anonymousId, and this
 * function does not attempt to backfill/join those in. That join is a stretch goal for
 * a future phase, not implemented here.
 */
export async function getLeadTimeline(leadId: string): Promise<TimelineEntry[]> {
  const [auditRows, analyticsRows] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: "Lead", entityId: leadId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.analyticsEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const entries: TimelineEntry[] = [
    ...auditRows.map((row) => ({
      timestamp: row.createdAt.toISOString(),
      source: "audit" as const,
      label: row.action,
      metadata: row.metadata,
    })),
    ...analyticsRows.map((row) => ({
      timestamp: row.createdAt.toISOString(),
      source: "analytics" as const,
      label: row.event,
      metadata: row.properties,
    })),
  ];

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

// ============================================================
// VENDOR RESPONSE REPORT (Stage 19, Phase 19.7.6)
//
// A reporting concern over already-persisted BookingRequest columns
// (createdAt/respondedAt/status) — not a new tracked analytics event. This
// belongs here, not as client-side analytics, for the same reason the rest
// of this file exists: read-only reporting over real, already-persisted
// data, kept separate from the customer/vendor-facing UI systems.
// ============================================================

export interface VendorResponseReport {
  totalRequests: number;
  respondedCount: number;
  responseRate: number; // 0-1
  averageResponseTimeMs: number | null; // null if respondedCount is 0
}

/**
 * Pure helper — computes the report from raw rows. Extracted for the same
 * unit-testability reason as countDistinctIds(): this repo's test suite has
 * no DB fixture/integration harness today.
 */
export function computeVendorResponseStats(
  rows: Array<{ createdAt: Date; respondedAt: Date | null }>
): VendorResponseReport {
  const responded = rows.filter((r) => r.respondedAt !== null);
  const totalResponseMs = responded.reduce(
    (sum, r) => sum + (r.respondedAt!.getTime() - r.createdAt.getTime()),
    0
  );

  return {
    totalRequests: rows.length,
    respondedCount: responded.length,
    responseRate: rows.length === 0 ? 0 : responded.length / rows.length,
    averageResponseTimeMs: responded.length === 0 ? null : totalResponseMs / responded.length,
  };
}

export async function computeVendorResponseReport(range: {
  from: Date;
  to: Date;
}): Promise<VendorResponseReport> {
  const rows = await prisma.bookingRequest.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { createdAt: true, respondedAt: true },
  });

  return computeVendorResponseStats(rows);
}
