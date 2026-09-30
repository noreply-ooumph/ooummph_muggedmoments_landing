/**
 * MuggedMoments — Unit Tests: Completeness Engine
 */

import { describe, it, expect } from "vitest";
import { evaluateCompleteness } from "@/domain/completeness/completenessService";

describe("Completeness Service", () => {
  it("marks lead as COMPLETE when all required fields are provided", () => {
    const input = {
      eventTypeId: "wedding-id",
      city: "Mumbai",
      eventDate: new Date("2026-12-01"),
      services: ["photography", "catering"],
      customerName: "Alice Sharma",
      phone: "+919876543210",
      whatsappConsent: true,
      budget: "100k-250k",
      guestCount: 150,
    };

    const result = evaluateCompleteness(input);

    expect(result.status).toBe("COMPLETE");
    expect(result.missingFields).toHaveLength(0);
  });

  it("marks lead as INCOMPLETE when required fields like city or phone are missing", () => {
    const input = {
      eventTypeId: "wedding-id",
      city: "",
      phone: "",
      whatsappConsent: true,
    };

    const result = evaluateCompleteness(input);

    expect(result.status).toBe("INCOMPLETE");
    expect(result.missingFields).toContain("city");
    expect(result.missingFields).toContain("phone");
  });
});
