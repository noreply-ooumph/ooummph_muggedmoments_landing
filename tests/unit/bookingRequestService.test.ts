import { describe, it, expect } from "vitest";
import {
  nextBookingRequestStatus,
  isBookingRequestExpired,
  resolveRejectionReasonText,
  REJECTION_REASONS,
  type BookingRequestStatusValue,
} from "@/domain/booking/bookingRequestService";

describe("nextBookingRequestStatus", () => {
  it("allows ACCEPT and REJECT from REQUESTED", () => {
    expect(nextBookingRequestStatus("REQUESTED", "ACCEPT")).toBe("ACCEPTED");
    expect(nextBookingRequestStatus("REQUESTED", "REJECT")).toBe("REJECTED");
  });

  const terminalStatuses: BookingRequestStatusValue[] = ["UNDER_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED"];

  it.each(terminalStatuses)("disallows ACCEPT from %s", (status) => {
    expect(nextBookingRequestStatus(status, "ACCEPT")).toBeNull();
  });

  it.each(terminalStatuses)("disallows REJECT from %s", (status) => {
    expect(nextBookingRequestStatus(status, "REJECT")).toBeNull();
  });
});

describe("isBookingRequestExpired", () => {
  const now = new Date("2026-09-26T12:00:00.000Z");

  it("is false for REQUESTED with a future deadline", () => {
    expect(
      isBookingRequestExpired({ status: "REQUESTED", responseDeadline: new Date("2026-09-27T00:00:00.000Z") }, now)
    ).toBe(false);
  });

  it("is true for REQUESTED with a past deadline", () => {
    expect(
      isBookingRequestExpired({ status: "REQUESTED", responseDeadline: new Date("2026-09-25T00:00:00.000Z") }, now)
    ).toBe(true);
  });

  it("is false exactly at the deadline boundary (not strictly past)", () => {
    expect(isBookingRequestExpired({ status: "REQUESTED", responseDeadline: now }, now)).toBe(false);
  });

  it("is false for ACCEPTED even with a past deadline — a decision was already recorded", () => {
    expect(
      isBookingRequestExpired({ status: "ACCEPTED", responseDeadline: new Date("2026-09-25T00:00:00.000Z") }, now)
    ).toBe(false);
  });

  it("is false for REJECTED even with a past deadline", () => {
    expect(
      isBookingRequestExpired({ status: "REJECTED", responseDeadline: new Date("2026-09-25T00:00:00.000Z") }, now)
    ).toBe(false);
  });
});

describe("resolveRejectionReasonText", () => {
  it("resolves the fixed label for each non-OTHER reason", () => {
    expect(resolveRejectionReasonText("DATE_NO_LONGER_AVAILABLE", undefined)).toBe(
      "Date is no longer available"
    );
    expect(resolveRejectionReasonText("BUDGET_MISMATCH", undefined)).toBe("Budget does not match this booking");
    expect(resolveRejectionReasonText("OUTSIDE_SERVICE_AREA", undefined)).toBe("Unable to service this location");
  });

  it("resolves OTHER to the trimmed note verbatim", () => {
    expect(resolveRejectionReasonText("OTHER", "  We're fully booked that whole month.  ")).toBe(
      "We're fully booked that whole month."
    );
  });

  it("resolves OTHER with no note to an empty string rather than throwing", () => {
    expect(resolveRejectionReasonText("OTHER", undefined)).toBe("");
  });

  it("REJECTION_REASONS contains exactly the four fixed codes in order", () => {
    expect(REJECTION_REASONS.map((r) => r.value)).toEqual([
      "DATE_NO_LONGER_AVAILABLE",
      "BUDGET_MISMATCH",
      "OUTSIDE_SERVICE_AREA",
      "OTHER",
    ]);
  });
});
