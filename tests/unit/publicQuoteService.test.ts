/**
 * MuggedMoments — Unit Tests: Public Quote Domain Logic
 */

import { describe, it, expect } from "vitest";
import { toPublicQuote, type RawSubmittedQuoteRow } from "@/domain/quote/publicQuoteService";
import { calculateTotal } from "@/domain/quote/quoteService";

function buildRow(overrides: Partial<RawSubmittedQuoteRow> = {}): RawSubmittedQuoteRow {
  return {
    vendorId: "vendor-1",
    vendorName: "Sharma Photography Studio",
    city: "Lucknow",
    services: [{ service: { name: "Photography" } }, { service: { name: "Videography" } }],
    submittedAt: new Date("2026-09-25T12:00:00.000Z"),
    messages: [],
    quote: {
      versionNumber: 1,
      availabilityState: "AVAILABLE",
      validUntil: new Date("2027-10-20T00:00:00.000Z"),
      included: ["Stage decoration"],
      excluded: ["Transportation"],
      lineItems: [
        { label: "Decoration", amount: 120000 },
        { label: "Lighting", amount: 40000 },
      ],
    },
    ...overrides,
  };
}

describe("Public Quote Service — toPublicQuote", () => {
  it("maps a fully-populated row correctly", () => {
    const result = toPublicQuote(buildRow());
    expect(result).toEqual({
      vendorId: "vendor-1",
      // vendorName is the anonymized display label (getVendorDisplayName()),
      // not the real row.vendorName — see publicQuoteService.ts's header comment.
      vendorName: "Photography & Videography Team — Lucknow",
      city: "Lucknow",
      services: ["Photography", "Videography"],
      total: 160000,
      availabilityState: "AVAILABLE",
      validUntil: "2027-10-20T00:00:00.000Z",
      included: ["Stage decoration"],
      excluded: ["Transportation"],
      submittedAt: "2026-09-25T12:00:00.000Z",
      versionNumber: 1,
      messages: [],
    });
  });

  it("returns the anonymized display name, never the real vendor name", () => {
    const row = buildRow();
    const result = toPublicQuote(row);
    expect(result.vendorName).not.toBe(row.vendorName);
  });

  it("maps messages through in order, converting createdAt to ISO strings (Stage 18, Phase 18.5)", () => {
    const result = toPublicQuote(
      buildRow({
        messages: [
          { senderType: "CUSTOMER", body: "Does this include lighting?", createdAt: new Date("2026-09-26T08:00:00.000Z") },
          { senderType: "VENDOR", body: "Yes, it does.", createdAt: new Date("2026-09-26T09:00:00.000Z") },
        ],
      })
    );
    expect(result.messages).toEqual([
      { senderType: "CUSTOMER", body: "Does this include lighting?", createdAt: "2026-09-26T08:00:00.000Z" },
      { senderType: "VENDOR", body: "Yes, it does.", createdAt: "2026-09-26T09:00:00.000Z" },
    ]);
  });

  it("maps an empty message list to an empty array", () => {
    expect(toPublicQuote(buildRow({ messages: [] })).messages).toEqual([]);
  });

  it("includes versionNumber (Stage 18, Phase 18.4) for a revised quote", () => {
    const result = toPublicQuote(buildRow({ quote: { ...buildRow().quote, versionNumber: 2 } }));
    expect(result.versionNumber).toBe(2);
  });

  it("computes total using the same calculateTotal() the vendor side uses", () => {
    const row = buildRow();
    const result = toPublicQuote(row);
    expect(result.total).toBe(calculateTotal(row.quote.lineItems));
  });

  it("passes a null validUntil through as null, never a string placeholder", () => {
    const result = toPublicQuote(buildRow({ quote: { ...buildRow().quote, validUntil: null } }));
    expect(result.validUntil).toBeNull();
  });

  it("passes a null submittedAt through as null, never a string placeholder", () => {
    const result = toPublicQuote(buildRow({ submittedAt: null }));
    expect(result.submittedAt).toBeNull();
  });

  it("maps empty included/excluded to empty arrays", () => {
    const result = toPublicQuote(
      buildRow({ quote: { ...buildRow().quote, included: [], excluded: [] } })
    );
    expect(result.included).toEqual([]);
    expect(result.excluded).toEqual([]);
  });

  it("maps empty services to an empty array", () => {
    const result = toPublicQuote(buildRow({ services: [] }));
    expect(result.services).toEqual([]);
  });

  it("passes all four availabilityState values through unchanged", () => {
    for (const state of ["AVAILABLE", "PENDING_CONFIRMATION", "UNAVAILABLE", "UNKNOWN"] as const) {
      const result = toPublicQuote(buildRow({ quote: { ...buildRow().quote, availabilityState: state } }));
      expect(result.availabilityState).toBe(state);
    }
  });
});
