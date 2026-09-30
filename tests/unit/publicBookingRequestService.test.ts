import { describe, it, expect } from "vitest";
import {
  toPublicBookingRequest,
  type RawBookingRequestRow,
  type PublicBookingRequestStatus,
} from "@/domain/booking/publicBookingRequestService";

function makeRow(overrides: Partial<RawBookingRequestRow> = {}): RawBookingRequestRow {
  return {
    vendorId: "vendor-1",
    vendorName: "Sharma Caterers",
    city: "Lucknow",
    services: [{ service: { name: "Catering" } }],
    status: "REQUESTED",
    quoteTotal: 50000,
    rejectionReason: null,
    createdAt: new Date("2026-09-26T10:00:00.000Z"),
    respondedAt: null,
    ...overrides,
  };
}

describe("toPublicBookingRequest", () => {
  it("maps all fields correctly for a freshly created request", () => {
    const row = makeRow();
    const result = toPublicBookingRequest(row);

    expect(result).toEqual({
      vendorId: "vendor-1",
      vendorName: "Catering Specialist — Lucknow",
      status: "REQUESTED",
      quoteTotal: 50000,
      rejectionReason: null,
      createdAt: "2026-09-26T10:00:00.000Z",
      respondedAt: null,
    });
  });

  it("returns the anonymized display name, never the real vendor name", () => {
    const row = makeRow({ vendorName: "Sharma Caterers", city: "Lucknow", services: [{ service: { name: "Catering" } }] });
    const result = toPublicBookingRequest(row);

    expect(result.vendorName).not.toBe("Sharma Caterers");
    expect(result.vendorName).toBe("Catering Specialist — Lucknow");
  });

  it("passes through a non-null rejectionReason unchanged", () => {
    const row = makeRow({
      status: "REJECTED",
      rejectionReason: "Date no longer available",
      respondedAt: new Date("2026-09-27T08:30:00.000Z"),
    });
    const result = toPublicBookingRequest(row);

    expect(result.rejectionReason).toBe("Date no longer available");
    expect(result.respondedAt).toBe("2026-09-27T08:30:00.000Z");
  });

  it("converts a null respondedAt to null (not undefined, not a string)", () => {
    const row = makeRow({ respondedAt: null });
    const result = toPublicBookingRequest(row);

    expect(result.respondedAt).toBeNull();
  });

  it("passes every status value through unchanged", () => {
    const statuses: PublicBookingRequestStatus[] = [
      "REQUESTED",
      "UNDER_REVIEW",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
    ];

    for (const status of statuses) {
      const result = toPublicBookingRequest(makeRow({ status }));
      expect(result.status).toBe(status);
    }
  });

  it("converts Date objects to ISO strings for createdAt", () => {
    const row = makeRow({ createdAt: new Date("2026-01-01T00:00:00.000Z") });
    const result = toPublicBookingRequest(row);

    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(typeof result.createdAt).toBe("string");
  });
});
