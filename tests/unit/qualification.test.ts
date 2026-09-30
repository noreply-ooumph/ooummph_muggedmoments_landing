/**
 * MuggedMoments — Unit Tests: Qualification State Machine
 */

import { describe, it, expect } from "vitest";
import {
  deriveNextStatus,
  beginResume,
} from "@/domain/qualification/qualificationService";

describe("Qualification State Machine — deriveNextStatus", () => {
  it("moves CAPTURED to INCOMPLETE when completeness is INCOMPLETE", () => {
    expect(
      deriveNextStatus("CAPTURED", { completenessStatus: "INCOMPLETE" })
    ).toBe("INCOMPLETE");
  });

  it("moves CAPTURED to COMPLETE when completeness is COMPLETE", () => {
    expect(
      deriveNextStatus("CAPTURED", { completenessStatus: "COMPLETE" })
    ).toBe("COMPLETE");
  });

  it("auto-promotes COMPLETE to QUALIFIED (CONFIGURATION_REQUIRED: score gate pending)", () => {
    expect(deriveNextStatus("COMPLETE", {})).toBe("QUALIFIED");
  });

  it("moves QUALIFIED to ROUTED when eligible vendors exist", () => {
    expect(
      deriveNextStatus("QUALIFIED", { eligibleMatchCount: 3 })
    ).toBe("ROUTED");
  });

  it("keeps QUALIFIED as QUALIFIED when no eligible vendors exist", () => {
    expect(
      deriveNextStatus("QUALIFIED", { eligibleMatchCount: 0 })
    ).toBe("QUALIFIED");
  });

  it("re-evaluating QUALIFICATION_PENDING with INCOMPLETE returns to INCOMPLETE", () => {
    expect(
      deriveNextStatus("QUALIFICATION_PENDING", {
        completenessStatus: "INCOMPLETE",
      })
    ).toBe("INCOMPLETE");
  });

  it("re-evaluating QUALIFICATION_PENDING with COMPLETE moves to COMPLETE", () => {
    expect(
      deriveNextStatus("QUALIFICATION_PENDING", {
        completenessStatus: "COMPLETE",
      })
    ).toBe("COMPLETE");
  });

  it("ROUTED is a terminal state for this table — unaffected by further input", () => {
    expect(deriveNextStatus("ROUTED", { eligibleMatchCount: 0 })).toBe(
      "ROUTED"
    );
  });
});

describe("Qualification State Machine — beginResume", () => {
  it("moves INCOMPLETE to QUALIFICATION_PENDING", () => {
    expect(beginResume("INCOMPLETE")).toBe("QUALIFICATION_PENDING");
  });

  it("leaves any other status unchanged", () => {
    expect(beginResume("QUALIFIED")).toBe("QUALIFIED");
    expect(beginResume("ROUTED")).toBe("ROUTED");
  });
});
