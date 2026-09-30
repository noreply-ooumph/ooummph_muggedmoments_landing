/**
 * MuggedMoments — Unit Tests: Contact Info Filter
 */

import { describe, it, expect } from "vitest";
import { detectContactInfo } from "@/domain/messaging/contactInfoFilter";

describe("detectContactInfo", () => {
  it("detects a plain 10-digit Indian mobile number with no separators", () => {
    expect(detectContactInfo("call me at 9876543210")).toBe("PHONE_NUMBER");
  });

  it("detects a mobile number with a +91 prefix and spaces", () => {
    expect(detectContactInfo("reach me on +91 98765 43210")).toBe("PHONE_NUMBER");
  });

  it("detects a mobile number with dashes", () => {
    expect(detectContactInfo("my number is 987-654-3210")).toBe("PHONE_NUMBER");
  });

  it("detects an email address", () => {
    expect(detectContactInfo("email me at vendor@example.com")).toBe("EMAIL_ADDRESS");
  });

  it("detects an email even alongside other text", () => {
    expect(detectContactInfo("Sure, send details to hello@studio.co.in for a quicker reply")).toBe(
      "EMAIL_ADDRESS"
    );
  });

  it("does not flag an ordinary guest-count message", () => {
    expect(detectContactInfo("We're expecting around 2000 guests for the wedding")).toBeNull();
  });

  it("does not flag an ordinary budget message", () => {
    expect(detectContactInfo("Our budget is approximately 500000 rupees")).toBeNull();
  });

  it("does not flag a quote total or date mentioned in prose", () => {
    expect(
      detectContactInfo("The quote total was 160000 and the event is on 15 June 2028")
    ).toBeNull();
  });

  it("does not flag ordinary conversational text with no numbers at all", () => {
    expect(detectContactInfo("Does this package include lighting and decor?")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(detectContactInfo("")).toBeNull();
  });
});
