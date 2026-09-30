import { describe, it, expect } from "vitest";
import { toPublicBookingTimelineEntry, type RawBookingStatusHistoryEntry } from "@/domain/booking/bookingTimelineService";

function makeRow(overrides: Partial<RawBookingStatusHistoryEntry> = {}): RawBookingStatusHistoryEntry {
  return {
    status: "CONFIRMED",
    note: "Created on acceptance of booking request.",
    createdAt: new Date("2026-09-26T07:40:18.660Z"),
    ...overrides,
  };
}

describe("toPublicBookingTimelineEntry", () => {
  it("maps all fields correctly", () => {
    const row = makeRow();
    const result = toPublicBookingTimelineEntry(row);

    expect(result).toEqual({
      status: "CONFIRMED",
      note: "Created on acceptance of booking request.",
      createdAt: "2026-09-26T07:40:18.660Z",
    });
  });

  it("converts createdAt to an ISO string", () => {
    const row = makeRow({ createdAt: new Date("2028-01-01T00:00:00.000Z") });
    const result = toPublicBookingTimelineEntry(row);

    expect(result.createdAt).toBe("2028-01-01T00:00:00.000Z");
    expect(typeof result.createdAt).toBe("string");
  });

  it("passes a null note through unchanged rather than substituting a default", () => {
    const row = makeRow({ note: null });
    const result = toPublicBookingTimelineEntry(row);

    expect(result.note).toBeNull();
  });

  it("passes the status through unchanged", () => {
    const result = toPublicBookingTimelineEntry(makeRow({ status: "CONFIRMED" }));
    expect(result.status).toBe("CONFIRMED");
  });
});
