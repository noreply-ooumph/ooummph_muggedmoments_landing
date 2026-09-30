/**
 * MuggedMoments — Unit Tests: Vendor Profile Domain Logic
 */

import { describe, it, expect } from "vitest";
import { deriveProfileComplete } from "@/domain/vendorProfile/vendorProfileService";

describe("Vendor Profile Service — deriveProfileComplete", () => {
  it("is false when about is null", () => {
    expect(
      deriveProfileComplete({ about: null, startingPrice: 5000, serviceAreas: ["Lucknow"] })
    ).toBe(false);
  });

  it("is false when about is empty string", () => {
    expect(
      deriveProfileComplete({ about: "", startingPrice: 5000, serviceAreas: ["Lucknow"] })
    ).toBe(false);
  });

  it("is false when about is whitespace only", () => {
    expect(
      deriveProfileComplete({ about: "   ", startingPrice: 5000, serviceAreas: ["Lucknow"] })
    ).toBe(false);
  });

  it("is false when startingPrice is null", () => {
    expect(
      deriveProfileComplete({ about: "We do great work.", startingPrice: null, serviceAreas: ["Lucknow"] })
    ).toBe(false);
  });

  it("is false when serviceAreas is empty", () => {
    expect(
      deriveProfileComplete({ about: "We do great work.", startingPrice: 5000, serviceAreas: [] })
    ).toBe(false);
  });

  it("is true when startingPrice is 0 (a valid non-negative price, not treated as missing)", () => {
    expect(
      deriveProfileComplete({ about: "We do great work.", startingPrice: 0, serviceAreas: ["Lucknow"] })
    ).toBe(true);
  });

  it("is true when all fields are meaningfully present", () => {
    expect(
      deriveProfileComplete({
        about: "We do great work.",
        startingPrice: 25000,
        serviceAreas: ["Lucknow", "Kanpur"],
      })
    ).toBe(true);
  });
});
