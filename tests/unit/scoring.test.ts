/**
 * MuggedMoments — Unit Tests: Scoring Service
 */

import { describe, it, expect } from "vitest";
import { calculateScore } from "@/domain/scoring/scoringService";

describe("Scoring Service", () => {
  it("evaluates matched scoring rules deterministically for lead data", () => {
    const input = {
      eventTypeId: "wedding-id",
      city: "Mumbai",
      eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      services: ["photography", "videography", "catering"],
      customerName: "Rohan Mehta",
      phone: "+919876543210",
      whatsappConsent: true,
      budget: "250k-500k",
      guestCount: 250,
    };

    const scoreResult = calculateScore(input);

    expect(scoreResult.score).toBeDefined();
    expect(scoreResult.matchedRules.length).toBeGreaterThan(0);
    expect(scoreResult.scoreVersion).toBeDefined();
  });

  it("returns reproducible score result structure", () => {
    const input = {
      city: "Delhi",
      services: ["dj-music"],
      whatsappConsent: false,
    };

    const result1 = calculateScore(input);
    const result2 = calculateScore(input);

    expect(result1.score).toBe(result2.score);
    expect(result1.matchedRules).toEqual(result2.matchedRules);
  });
});
