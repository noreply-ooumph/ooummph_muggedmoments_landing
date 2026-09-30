/**
 * MuggedMoments — Unit Tests: Public Vendor Profile Domain Logic
 */

import { describe, it, expect } from "vitest";
import {
  toPublicVendorProfile,
  type RawPublicVendorRow,
} from "@/domain/vendorProfile/publicVendorProfileService";

function buildRow(overrides: Partial<RawPublicVendorRow> = {}): RawPublicVendorRow {
  return {
    id: "vendor-1",
    name: "Sharma Photography Studio",
    city: "Lucknow",
    about: "We do great work.",
    startingPrice: 35000,
    serviceAreas: ["Lucknow", "Kanpur"],
    verificationStatus: "PENDING",
    services: [
      { service: { name: "Photography", slug: "photography" } },
      { service: { name: "Videography", slug: "videography" } },
    ],
    portfolioItems: [{ id: "item-1", imagePath: "/uploads/vendor-portfolio/vendor-1/a.jpg" }],
    documents: [
      { id: "doc-1", filePath: "/uploads/vendor-documents/vendor-1/a.pdf", originalFilename: "brochure.pdf" },
    ],
    ...overrides,
  };
}

describe("Public Vendor Profile Service — toPublicVendorProfile", () => {
  it("maps a fully-populated vendor correctly", () => {
    const result = toPublicVendorProfile(buildRow());
    expect(result).toEqual({
      id: "vendor-1",
      // name is the anonymized display label (getVendorDisplayName()), not the
      // real vendor.name — see this file's header comment and
      // vendorDisplayName.ts for the full disintermediation-prevention reasoning.
      name: "Photography & Videography Team — Lucknow",
      city: "Lucknow",
      about: "We do great work.",
      startingPrice: 35000,
      serviceAreas: ["Lucknow", "Kanpur"],
      verificationStatus: "PENDING",
      services: ["Photography", "Videography"],
      serviceSlugs: ["photography", "videography"],
      portfolioItems: [{ id: "item-1", imagePath: "/uploads/vendor-portfolio/vendor-1/a.jpg" }],
      documents: [
        { id: "doc-1", filePath: "/uploads/vendor-documents/vendor-1/a.pdf", originalFilename: "brochure.pdf" },
      ],
    });
  });

  it("returns the anonymized display name, never the real vendor name", () => {
    const row = buildRow();
    const result = toPublicVendorProfile(row);
    expect(result.name).not.toBe(row.name);
  });

  it("never leaks contactPhone, isDevelopmentSeed, createdAt, or updatedAt", () => {
    const result = toPublicVendorProfile(buildRow());
    const keys = Object.keys(result);
    expect(keys).not.toContain("contactPhone");
    expect(keys).not.toContain("isDevelopmentSeed");
    expect(keys).not.toContain("createdAt");
    expect(keys).not.toContain("updatedAt");
  });

  it("maps empty services, portfolioItems, and documents to empty arrays, not undefined/null", () => {
    const result = toPublicVendorProfile(buildRow({ services: [], portfolioItems: [], documents: [] }));
    expect(result.services).toEqual([]);
    expect(result.portfolioItems).toEqual([]);
    expect(result.documents).toEqual([]);
  });

  it("passes verificationStatus PENDING through unchanged", () => {
    const result = toPublicVendorProfile(buildRow({ verificationStatus: "PENDING" }));
    expect(result.verificationStatus).toBe("PENDING");
  });

  it("passes verificationStatus VERIFIED through unchanged", () => {
    const result = toPublicVendorProfile(buildRow({ verificationStatus: "VERIFIED" }));
    expect(result.verificationStatus).toBe("VERIFIED");
  });

  it("passes verificationStatus REJECTED through unchanged", () => {
    const result = toPublicVendorProfile(buildRow({ verificationStatus: "REJECTED" }));
    expect(result.verificationStatus).toBe("REJECTED");
  });

  it("passes through a null about and null startingPrice unchanged (no fabricated defaults)", () => {
    const result = toPublicVendorProfile(buildRow({ about: null, startingPrice: null }));
    expect(result.about).toBeNull();
    expect(result.startingPrice).toBeNull();
  });
});
