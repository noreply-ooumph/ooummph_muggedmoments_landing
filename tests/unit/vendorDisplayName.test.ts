/**
 * MuggedMoments — Unit Tests: Vendor Display Name (anonymization)
 */

import { describe, it, expect } from "vitest";
import { getVendorDisplayName } from "@/domain/vendorProfile/vendorDisplayName";

describe("getVendorDisplayName", () => {
  it("combines the top two services with the city for 2+ services", () => {
    expect(getVendorDisplayName("Lucknow", ["Photography", "Videography", "Catering"])).toBe(
      "Photography & Videography Team — Lucknow"
    );
  });

  it("uses a Specialist label for exactly one service", () => {
    expect(getVendorDisplayName("Mumbai", ["Photography"])).toBe(
      "Photography Specialist — Mumbai"
    );
  });

  it("falls back to a generic label when there are no services", () => {
    expect(getVendorDisplayName("Agra", [])).toBe("Vendor — Agra");
  });

  it("never includes anything resembling a proper business name", () => {
    const result = getVendorDisplayName("Lucknow", ["Photography", "Catering"]);
    expect(result).not.toMatch(/Studio|Works|Pvt|Ltd/i);
  });
});
