/**
 * MuggedMoments — Unit Tests: Vendor Session Token Hashing
 *
 * OTP-specific tests (generateOtpCode, isOtpValid, getOtpExpiryDate) removed
 * along with the OTP flow itself — see src/domain/vendorAuth/otpService.ts's
 * header comment. hashSessionToken is unrelated to OTP and still in use.
 */

import { describe, it, expect } from "vitest";
import { hashSessionToken } from "@/domain/vendorAuth/otpService";

describe("OTP Service — hashSessionToken", () => {
  it("produces a deterministic hash for the same input", () => {
    expect(hashSessionToken("abc")).toBe(hashSessionToken("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashSessionToken("abc")).not.toBe(hashSessionToken("xyz"));
  });

  it("never returns the raw input as the hash", () => {
    expect(hashSessionToken("abc")).not.toBe("abc");
  });
});
