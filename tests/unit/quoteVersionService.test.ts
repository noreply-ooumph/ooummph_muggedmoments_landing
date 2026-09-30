/**
 * MuggedMoments — Unit Tests: Quote Version Domain Logic
 */

import { describe, it, expect } from "vitest";
import {
  getCurrentVersion,
  getDraftVersion,
  nextVersionNumber,
} from "@/domain/quote/quoteVersionService";

describe("Quote Version Service — getCurrentVersion", () => {
  it("returns null for an empty array", () => {
    expect(getCurrentVersion([])).toBeNull();
  });

  it("returns null when all versions are DRAFT", () => {
    expect(
      getCurrentVersion([{ id: "1", versionNumber: 1, status: "DRAFT" }])
    ).toBeNull();
  });

  it("returns the only SUBMITTED version", () => {
    const v1 = { id: "1", versionNumber: 1, status: "SUBMITTED" as const };
    expect(getCurrentVersion([v1])).toBe(v1);
  });

  it("returns the highest-numbered SUBMITTED version when several exist", () => {
    const v1 = { id: "1", versionNumber: 1, status: "SUBMITTED" as const };
    const v2 = { id: "2", versionNumber: 2, status: "SUBMITTED" as const };
    expect(getCurrentVersion([v1, v2])).toBe(v2);
  });

  it("ignores a trailing DRAFT version when picking the current SUBMITTED one", () => {
    const v1 = { id: "1", versionNumber: 1, status: "SUBMITTED" as const };
    const v2 = { id: "2", versionNumber: 2, status: "SUBMITTED" as const };
    const v3 = { id: "3", versionNumber: 3, status: "DRAFT" as const };
    expect(getCurrentVersion([v1, v2, v3])).toBe(v2);
  });
});

describe("Quote Version Service — getDraftVersion", () => {
  it("returns null when no draft exists", () => {
    expect(
      getDraftVersion([{ id: "1", versionNumber: 1, status: "SUBMITTED" }])
    ).toBeNull();
  });

  it("finds the one draft version", () => {
    const draft = { id: "2", versionNumber: 2, status: "DRAFT" as const };
    expect(
      getDraftVersion([{ id: "1", versionNumber: 1, status: "SUBMITTED" }, draft])
    ).toBe(draft);
  });
});

describe("Quote Version Service — nextVersionNumber", () => {
  it("returns 1 for an empty array", () => {
    expect(nextVersionNumber([])).toBe(1);
  });

  it("returns max + 1 for a normal sequence", () => {
    expect(
      nextVersionNumber([
        { id: "1", versionNumber: 1, status: "SUBMITTED" },
        { id: "2", versionNumber: 2, status: "SUBMITTED" },
      ])
    ).toBe(3);
  });

  it("returns max + 1 even for a non-contiguous/out-of-order input", () => {
    expect(
      nextVersionNumber([
        { id: "1", versionNumber: 3, status: "SUBMITTED" },
        { id: "2", versionNumber: 1, status: "SUBMITTED" },
      ])
    ).toBe(4);
  });
});
