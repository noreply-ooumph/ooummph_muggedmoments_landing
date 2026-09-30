/**
 * MuggedMoments — Unit Tests: Vendor Opportunity Domain Logic
 */

import { describe, it, expect } from "vitest";
import {
  nextStatus,
  getResponseDeadline,
  isExpired,
} from "@/domain/opportunity/opportunityService";

describe("Opportunity Service — nextStatus (valid transitions)", () => {
  it("SENT + VIEW -> VIEWED", () => {
    expect(nextStatus("SENT", "VIEW")).toBe("VIEWED");
  });

  it("VIEWED + INTERESTED -> INTERESTED", () => {
    expect(nextStatus("VIEWED", "INTERESTED")).toBe("INTERESTED");
  });

  it("VIEWED + DECLINE -> DECLINED", () => {
    expect(nextStatus("VIEWED", "DECLINE")).toBe("DECLINED");
  });
});

describe("Opportunity Service — nextStatus (invalid transitions)", () => {
  it("CREATED + VIEW -> null (must go through SENT first)", () => {
    expect(nextStatus("CREATED", "VIEW")).toBeNull();
  });

  it("SENT + INTERESTED -> null (must be VIEWED first)", () => {
    expect(nextStatus("SENT", "INTERESTED")).toBeNull();
  });

  it("SENT + DECLINE -> null (must be VIEWED first)", () => {
    expect(nextStatus("SENT", "DECLINE")).toBeNull();
  });

  it("DECLINED + INTERESTED -> null (no reopening a declined opportunity)", () => {
    expect(nextStatus("DECLINED", "INTERESTED")).toBeNull();
  });

  it("INTERESTED + DECLINE -> null (no reversing a recorded decision)", () => {
    expect(nextStatus("INTERESTED", "DECLINE")).toBeNull();
  });

  it("VIEWED + VIEW -> null (already viewed, not a re-view transition)", () => {
    expect(nextStatus("VIEWED", "VIEW")).toBeNull();
  });

  it("QUOTE_SUBMITTED + SUBMIT_QUOTE -> null (an already-submitted quote cannot be resubmitted)", () => {
    expect(nextStatus("QUOTE_SUBMITTED", "SUBMIT_QUOTE")).toBeNull();
  });
});

describe("Opportunity Service — nextStatus (Stage 18, Phase 18.1 quote transitions)", () => {
  it("INTERESTED + START_QUOTE -> QUOTE_PENDING", () => {
    expect(nextStatus("INTERESTED", "START_QUOTE")).toBe("QUOTE_PENDING");
  });

  it("QUOTE_PENDING + SUBMIT_QUOTE -> QUOTE_SUBMITTED", () => {
    expect(nextStatus("QUOTE_PENDING", "SUBMIT_QUOTE")).toBe("QUOTE_SUBMITTED");
  });
});

describe("Opportunity Service — getResponseDeadline", () => {
  it("returns a date exactly 48 hours after now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const deadline = getResponseDeadline(now);
    expect(deadline.getTime() - now.getTime()).toBe(48 * 60 * 60 * 1000);
  });
});

describe("Opportunity Service — isExpired", () => {
  const now = new Date("2026-01-10T00:00:00.000Z");

  it("is false when SENT and deadline is in the future", () => {
    expect(
      isExpired({ status: "SENT", responseDeadline: new Date(now.getTime() + 1000) }, now)
    ).toBe(false);
  });

  it("is true when SENT and deadline has passed", () => {
    expect(
      isExpired({ status: "SENT", responseDeadline: new Date(now.getTime() - 1000) }, now)
    ).toBe(true);
  });

  it("is true when VIEWED and deadline has passed", () => {
    expect(
      isExpired({ status: "VIEWED", responseDeadline: new Date(now.getTime() - 1000) }, now)
    ).toBe(true);
  });

  it("is false at the exact deadline instant (strictly after, not at)", () => {
    expect(isExpired({ status: "SENT", responseDeadline: now }, now)).toBe(false);
  });

  it("is false once INTERESTED, even if the deadline has passed", () => {
    expect(
      isExpired({ status: "INTERESTED", responseDeadline: new Date(now.getTime() - 1000) }, now)
    ).toBe(false);
  });

  it("is false once DECLINED, even if the deadline has passed", () => {
    expect(
      isExpired({ status: "DECLINED", responseDeadline: new Date(now.getTime() - 1000) }, now)
    ).toBe(false);
  });
});
