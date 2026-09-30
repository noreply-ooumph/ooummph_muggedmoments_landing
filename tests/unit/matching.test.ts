/**
 * MuggedMoments — Unit Tests: Vendor Matching Engine
 */

import { describe, it, expect } from "vitest";
import { evaluateCompatibility } from "@/domain/matching/matchingService";

describe("Vendor Matching Service", () => {
  const sampleVendor = {
    id: "v1",
    name: "Aura Studio Photography",
    city: "Mumbai",
    active: true,
    profileComplete: true,
    services: [
      {
        service: { slug: "photography" },
        eventTypes: ["wedding", "birthday"],
      },
      {
        service: { slug: "videography" },
        eventTypes: ["wedding"],
      },
    ],
  };

  it("matches vendor when city, event type, and requested services align", () => {
    const input = {
      leadId: "lead-1",
      city: "Mumbai",
      eventTypeSlug: "wedding",
      services: ["photography"],
      eventDate: new Date("2026-12-25"),
    };

    const match = evaluateCompatibility(sampleVendor, input);

    expect(match.eligible).toBe(true);
    expect(match.reasons).toContain("CITY_MATCH");
    expect(match.reasons).toContain("EVENT_TYPE_MATCH");
    expect(match.reasons).toContain("SERVICE_MATCH");
  });

  it("rejects vendor when city does not match", () => {
    const input = {
      leadId: "lead-2",
      city: "Bangalore",
      eventTypeSlug: "wedding",
      services: ["photography"],
      eventDate: new Date("2026-12-25"),
    };

    const match = evaluateCompatibility(sampleVendor, input);

    expect(match.eligible).toBe(false);
    expect(match.reasons).toContain("CITY_MISMATCH");
  });

  it("matches an \"other\" custom event on city + service alone, skipping the event_type dimension entirely", () => {
    const input = {
      leadId: "lead-4",
      city: "Mumbai",
      eventTypeSlug: "other",
      services: ["photography"],
      eventDate: new Date("2026-12-25"),
    };

    const match = evaluateCompatibility(sampleVendor, input);

    expect(match.eligible).toBe(true);
    expect(match.reasons).toContain("CITY_MATCH");
    expect(match.reasons).toContain("SERVICE_MATCH");
    // Never counted as either a match or a mismatch — no vendor can have
    // pre-declared support for an unbounded custom event category.
    expect(match.reasons).not.toContain("EVENT_TYPE_MATCH");
    expect(match.reasons).not.toContain("EVENT_TYPE_MISMATCH");
  });

  it("rejects inactive vendor", () => {
    const inactiveVendor = { ...sampleVendor, active: false };
    const input = {
      leadId: "lead-3",
      city: "Mumbai",
      eventTypeSlug: "wedding",
      services: ["photography"],
      eventDate: new Date("2026-12-25"),
    };

    const match = evaluateCompatibility(inactiveVendor, input);

    expect(match.eligible).toBe(false);
    expect(match.reasons).toContain("VENDOR_INACTIVE");
  });
});
