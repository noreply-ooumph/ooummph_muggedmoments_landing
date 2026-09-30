import { describe, it, expect } from "vitest";
import { toPublicBooking, type RawBookingRow } from "@/domain/booking/publicBookingService";

function makeRow(overrides: Partial<RawBookingRow> = {}): RawBookingRow {
  return {
    publicBookingId: "BK-ABCD1234",
    vendorId: "vendor-1",
    vendorName: "Sharma Photography Studio",
    date: new Date("2027-11-05T00:00:00.000Z"),
    quoteTotal: 62000,
    createdAt: new Date("2026-09-26T07:17:52.059Z"),
    timeline: [],
    status: "CONFIRMED",
    ...overrides,
  };
}

describe("toPublicBooking", () => {
  it("maps all fields correctly", () => {
    const row = makeRow();
    const result = toPublicBooking(row);

    expect(result).toEqual({
      publicBookingId: "BK-ABCD1234",
      vendorId: "vendor-1",
      vendorName: "Sharma Photography Studio",
      date: "2027-11-05T00:00:00.000Z",
      quoteTotal: 62000,
      createdAt: "2026-09-26T07:17:52.059Z",
      timeline: [],
      status: "CONFIRMED",
    });
  });

  it("converts the booking date to an ISO string, distinct from createdAt", () => {
    const row = makeRow({
      date: new Date("2028-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const result = toPublicBooking(row);

    expect(result.date).toBe("2028-03-01T00:00:00.000Z");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.date).not.toBe(result.createdAt);
  });

  it("does not transpose vendorId/vendorName or date/createdAt with distinct fixture values", () => {
    const row: RawBookingRow = {
      publicBookingId: "BK-DISTINCT1",
      vendorId: "vendor-distinct-id",
      vendorName: "Distinct Vendor Name",
      date: new Date("2029-07-04T00:00:00.000Z"),
      quoteTotal: 12345,
      createdAt: new Date("2029-01-15T00:00:00.000Z"),
      timeline: [],
      status: "CONFIRMED",
    };
    const result = toPublicBooking(row);

    expect(result.vendorId).toBe("vendor-distinct-id");
    expect(result.vendorName).toBe("Distinct Vendor Name");
    expect(result.date).toBe("2029-07-04T00:00:00.000Z");
    expect(result.quoteTotal).toBe(12345);
    expect(result.createdAt).toBe("2029-01-15T00:00:00.000Z");
  });

  it("passes quoteTotal through unchanged", () => {
    expect(toPublicBooking(makeRow({ quoteTotal: 0 })).quoteTotal).toBe(0);
    expect(toPublicBooking(makeRow({ quoteTotal: 999999 })).quoteTotal).toBe(999999);
  });

  it("maps timeline entries via toPublicBookingTimelineEntry (Stage 19, Phase 19.4)", () => {
    const row = makeRow({
      timeline: [
        {
          status: "CONFIRMED",
          note: "Created on acceptance of booking request.",
          createdAt: new Date("2026-09-26T07:40:18.660Z"),
        },
      ],
    });
    const result = toPublicBooking(row);

    expect(result.timeline).toEqual([
      {
        status: "CONFIRMED",
        note: "Created on acceptance of booking request.",
        createdAt: "2026-09-26T07:40:18.660Z",
      },
    ]);
  });

  it("returns an empty timeline array unchanged when none is given", () => {
    expect(toPublicBooking(makeRow()).timeline).toEqual([]);
  });

  it("passes status through unchanged for both CONFIRMED and CANCELLED (Stage 19, Phase 19.5)", () => {
    expect(toPublicBooking(makeRow({ status: "CONFIRMED" })).status).toBe("CONFIRMED");
    expect(toPublicBooking(makeRow({ status: "CANCELLED" })).status).toBe("CANCELLED");
  });

  it("passes publicBookingId through unchanged (Stage 19, Phase 19.7.3)", () => {
    expect(toPublicBooking(makeRow({ publicBookingId: "BK-99999999" })).publicBookingId).toBe(
      "BK-99999999"
    );
  });
});
