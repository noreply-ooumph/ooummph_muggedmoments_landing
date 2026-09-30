/**
 * MuggedMoments — Unit Tests: Funnel Reporting (pure logic only)
 *
 * computeFunnelReport() and getLeadTimeline() themselves are DB-backed (Prisma) and are
 * not covered here — this repo's test suite has no database fixture/integration harness
 * today (see tests/unit/*.test.ts convention: pure functions, no mocking). Only the
 * pure distinct-counting logic they depend on is unit-tested.
 */

import { describe, it, expect } from "vitest";
import { countDistinctIds, computeVendorResponseStats } from "@/domain/analytics/funnelService";

describe("Funnel Reporting — countDistinctIds", () => {
  it("counts each anonymousId once even if it appears multiple times", () => {
    const rows = [
      { anonymousId: "a1", leadId: null },
      { anonymousId: "a1", leadId: null },
      { anonymousId: "a2", leadId: null },
    ];
    expect(countDistinctIds(rows)).toBe(2);
  });

  it("prefers leadId over anonymousId when both are present on the same row", () => {
    const rows = [{ anonymousId: "a1", leadId: "lead-1" }];
    expect(countDistinctIds(rows)).toBe(1);
  });

  it("counts a lead's pre- and post-creation events as one identity once leadId is known", () => {
    const rows = [
      { anonymousId: "a1", leadId: null }, // page_view, before lead existed
      { anonymousId: "a1", leadId: "lead-1" }, // lead_created, same visitor
    ];
    // These are two distinct id values by this pure function's own dedup key
    // (leadId ?? anonymousId), since the first row has no leadId — this documents the
    // known limitation stated in funnelService.ts rather than hiding it.
    expect(countDistinctIds(rows)).toBe(2);
  });

  it("returns 0 for an empty input", () => {
    expect(countDistinctIds([])).toBe(0);
  });

  it("ignores rows with neither id present", () => {
    const rows = [{ anonymousId: null, leadId: null }];
    expect(countDistinctIds(rows)).toBe(0);
  });
});

describe("Vendor Response Report — computeVendorResponseStats (Stage 19, Phase 19.7.6)", () => {
  it("returns zeroed stats for no requests", () => {
    expect(computeVendorResponseStats([])).toEqual({
      totalRequests: 0,
      respondedCount: 0,
      responseRate: 0,
      averageResponseTimeMs: null,
    });
  });

  it("computes response rate and average response time for a mix of responded/unresponded", () => {
    const rows = [
      { createdAt: new Date("2026-01-01T00:00:00.000Z"), respondedAt: new Date("2026-01-01T01:00:00.000Z") }, // 1h
      { createdAt: new Date("2026-01-01T00:00:00.000Z"), respondedAt: new Date("2026-01-01T03:00:00.000Z") }, // 3h
      { createdAt: new Date("2026-01-01T00:00:00.000Z"), respondedAt: null },
    ];
    const result = computeVendorResponseStats(rows);
    expect(result.totalRequests).toBe(3);
    expect(result.respondedCount).toBe(2);
    expect(result.responseRate).toBeCloseTo(2 / 3);
    expect(result.averageResponseTimeMs).toBe(2 * 60 * 60 * 1000); // average of 1h and 3h
  });

  it("returns a null average when nothing has been responded to yet", () => {
    const rows = [{ createdAt: new Date("2026-01-01T00:00:00.000Z"), respondedAt: null }];
    const result = computeVendorResponseStats(rows);
    expect(result.responseRate).toBe(0);
    expect(result.averageResponseTimeMs).toBeNull();
  });

  it("gives a 100% response rate when every request has been responded to", () => {
    const rows = [
      { createdAt: new Date("2026-01-01T00:00:00.000Z"), respondedAt: new Date("2026-01-01T00:30:00.000Z") },
    ];
    expect(computeVendorResponseStats(rows).responseRate).toBe(1);
  });
});
