/**
 * MuggedMoments — Unit Tests: Vendor Quote Domain Logic
 */

import { describe, it, expect } from "vitest";
import { calculateTotal, getSubmissionFailureReasons } from "@/domain/quote/quoteService";

describe("Quote Service — calculateTotal", () => {
  it("returns 0 for an empty list", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("returns the amount for a single line item", () => {
    expect(calculateTotal([{ label: "Decoration", amount: 120000 }])).toBe(120000);
  });

  it("sums multiple line items", () => {
    expect(
      calculateTotal([
        { label: "Decoration", amount: 120000 },
        { label: "Lighting", amount: 40000 },
        { label: "Stage", amount: 50000 },
      ])
    ).toBe(210000);
  });
});

describe("Quote Service — getSubmissionFailureReasons", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const validQuote = {
    lineItems: [{ label: "Decoration", amount: 100000 }],
    availabilityState: "AVAILABLE" as const,
    validUntil: future,
  };

  it("returns no reasons for a fully valid quote", () => {
    expect(getSubmissionFailureReasons(validQuote, now)).toEqual([]);
  });

  it("flags NO_LINE_ITEMS when there are no line items", () => {
    const reasons = getSubmissionFailureReasons({ ...validQuote, lineItems: [] }, now);
    expect(reasons).toContain("NO_LINE_ITEMS");
  });

  it("flags INVALID_LINE_ITEM_AMOUNT for a negative amount", () => {
    const reasons = getSubmissionFailureReasons(
      { ...validQuote, lineItems: [{ label: "Bad", amount: -5 }] },
      now
    );
    expect(reasons).toContain("INVALID_LINE_ITEM_AMOUNT");
  });

  it("flags INVALID_LINE_ITEM_AMOUNT for a non-integer amount", () => {
    const reasons = getSubmissionFailureReasons(
      { ...validQuote, lineItems: [{ label: "Bad", amount: 100.5 }] },
      now
    );
    expect(reasons).toContain("INVALID_LINE_ITEM_AMOUNT");
  });

  it("flags AVAILABILITY_NOT_SET when availabilityState is UNKNOWN", () => {
    const reasons = getSubmissionFailureReasons(
      { ...validQuote, availabilityState: "UNKNOWN" },
      now
    );
    expect(reasons).toContain("AVAILABILITY_NOT_SET");
  });

  it("flags VALID_UNTIL_MISSING when validUntil is null", () => {
    const reasons = getSubmissionFailureReasons({ ...validQuote, validUntil: null }, now);
    expect(reasons).toContain("VALID_UNTIL_MISSING");
  });

  it("flags VALID_UNTIL_IN_PAST when validUntil is in the past", () => {
    const reasons = getSubmissionFailureReasons({ ...validQuote, validUntil: past }, now);
    expect(reasons).toContain("VALID_UNTIL_IN_PAST");
  });

  it("flags VALID_UNTIL_IN_PAST when validUntil equals now (strictly future required)", () => {
    const reasons = getSubmissionFailureReasons({ ...validQuote, validUntil: now }, now);
    expect(reasons).toContain("VALID_UNTIL_IN_PAST");
  });
});
