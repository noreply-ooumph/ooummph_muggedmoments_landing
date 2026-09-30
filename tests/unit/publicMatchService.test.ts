/**
 * MuggedMoments — Unit Tests: Public Match Service
 */

import { describe, it, expect } from "vitest";
import {
  toPublicMatches,
  type RawMatchRow,
} from "@/domain/matching/publicMatchService";

const eligibleRow: RawMatchRow = {
  eligible: true,
  availability: "AVAILABLE",
  vendorInterested: false,
  vendor: {
    id: "vendor-aura-studio",
    name: "Aura Studio Photography",
    city: "Mumbai",
    services: [{ service: { name: "Photography" } }, { service: { name: "Catering" } }],
    startingPrice: 35000,
  },
};

const ineligibleRow: RawMatchRow = {
  eligible: false,
  availability: "UNKNOWN",
  vendorInterested: false,
  vendor: {
    id: "vendor-wrong-city",
    name: "Wrong City Vendor",
    city: "Delhi",
    services: [{ service: { name: "Photography" } }],
    startingPrice: null,
  },
};

const eligibleRowNoPrice: RawMatchRow = {
  eligible: true,
  availability: "AVAILABLE",
  vendorInterested: false,
  vendor: {
    id: "vendor-no-price",
    name: "No Price Set Vendor",
    city: "Mumbai",
    services: [{ service: { name: "Photography" } }],
    startingPrice: null,
  },
};

describe("Public Match Service — toPublicMatches", () => {
  it("includes only eligible vendors", () => {
    const result = toPublicMatches([eligibleRow, ineligibleRow]);
    expect(result).toHaveLength(1);
    // vendorName is the anonymized display label (getVendorDisplayName()), not
    // the real vendor.name — see publicMatchService.ts's header comment.
    expect(result[0].vendorName).toBe("Photography & Catering Team — Mumbai");
  });

  it("returns the anonymized display name, never the real vendor.name", () => {
    const result = toPublicMatches([eligibleRow]);
    expect(result[0].vendorName).not.toBe(eligibleRow.vendor.name);
  });

  it("includes vendorId (Stage 16, Phase 4) but never an internal reasons or contactPhone field", () => {
    const result = toPublicMatches([eligibleRow]);
    expect(result[0].vendorId).toBe("vendor-aura-studio");
    expect(result[0]).not.toHaveProperty("reasons");
    expect(result[0]).not.toHaveProperty("contactPhone");
  });

  it("does not leak vendorId (or anything else) for a filtered-out ineligible row", () => {
    const result = toPublicMatches([ineligibleRow]);
    expect(result).toEqual([]);
  });

  it("maps startingPrice through unchanged for a real value (Stage 16, Phase 5)", () => {
    const result = toPublicMatches([eligibleRow]);
    expect(result[0].startingPrice).toBe(35000);
  });

  it("passes a null startingPrice through unchanged — never coerced to 0", () => {
    const result = toPublicMatches([eligibleRowNoPrice]);
    expect(result[0].startingPrice).toBeNull();
  });

  it("maps services to their human-readable names", () => {
    const result = toPublicMatches([eligibleRow]);
    expect(result[0].services).toEqual(["Photography", "Catering"]);
  });

  it("passes availability straight through without transformation", () => {
    const unknownAvailable: RawMatchRow = {
      ...eligibleRow,
      availability: "UNKNOWN",
    };
    const result = toPublicMatches([unknownAvailable]);
    expect(result[0].availability).toBe("UNKNOWN");
  });

  it("returns an empty array when no rows are eligible", () => {
    expect(toPublicMatches([ineligibleRow])).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(toPublicMatches([])).toEqual([]);
  });

  it("passes vendorInterested through unchanged when true", () => {
    const interestedRow: RawMatchRow = { ...eligibleRow, vendorInterested: true };
    const result = toPublicMatches([interestedRow]);
    expect(result[0].vendorInterested).toBe(true);
  });

  it("passes vendorInterested through unchanged when false", () => {
    const result = toPublicMatches([eligibleRow]);
    expect(result[0].vendorInterested).toBe(false);
  });
});
