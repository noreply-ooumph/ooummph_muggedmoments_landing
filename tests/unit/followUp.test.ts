/**
 * MuggedMoments — Unit Tests: Follow-Up / Reminder Engine
 */

import { describe, it, expect } from "vitest";
import { getDueReminder } from "@/domain/followUp/followUpService";

const HOUR = 60 * 60 * 1000;

describe("Follow-Up Engine — getDueReminder", () => {
  const now = new Date("2026-01-10T00:00:00.000Z");

  it("returns null when not enough time has elapsed since the last update", () => {
    const lead = {
      qualificationStatus: "INCOMPLETE" as const,
      updatedAt: new Date(now.getTime() - 1 * HOUR),
    };
    expect(getDueReminder(lead, 0, now)).toBeNull();
  });

  it("returns the first reminder once the delay threshold has elapsed", () => {
    const lead = {
      qualificationStatus: "INCOMPLETE" as const,
      updatedAt: new Date(now.getTime() - 25 * HOUR),
    };
    const due = getDueReminder(lead, 0, now);
    expect(due).not.toBeNull();
    expect(due?.version).toBe("1");
  });

  it("returns null once the maximum reminder count has already been sent", () => {
    const lead = {
      qualificationStatus: "INCOMPLETE" as const,
      updatedAt: new Date(now.getTime() - 1000 * HOUR),
    };
    expect(getDueReminder(lead, 2, now)).toBeNull();
  });

  it("is eligible for a QUALIFIED lead with no vendor yet", () => {
    const lead = {
      qualificationStatus: "QUALIFIED" as const,
      updatedAt: new Date(now.getTime() - 25 * HOUR),
    };
    expect(getDueReminder(lead, 0, now)).not.toBeNull();
  });

  it("is never eligible for a COMPLETE, CAPTURED, or ROUTED lead", () => {
    const base = { updatedAt: new Date(now.getTime() - 1000 * HOUR) };
    expect(
      getDueReminder({ ...base, qualificationStatus: "COMPLETE" }, 0, now)
    ).toBeNull();
    expect(
      getDueReminder({ ...base, qualificationStatus: "CAPTURED" }, 0, now)
    ).toBeNull();
    expect(
      getDueReminder({ ...base, qualificationStatus: "ROUTED" }, 0, now)
    ).toBeNull();
  });
});
