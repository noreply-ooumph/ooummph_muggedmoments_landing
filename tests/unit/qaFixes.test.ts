/**
 * MuggedMoments — Unit Tests: QA Defect Fixes Verification
 *
 * Verifies fixes for defects documented in MuggedMoments_Detailed_QA_Test_Report.pdf:
 * - BUG-001: Production siteUrl resolution
 * - BUG-009: Standardized date and time formatting
 * - BUG-010: City normalization and schema transformations
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCityName,
  formatCityName,
  formatStandardDate,
  formatStandardDateTime,
  formatConsultationSlot,
} from "@/lib/format";
import { SITE_CONFIG } from "@/config/content";
import { CreateLeadSchema, VendorRegisterSchema } from "@/lib/validation/schemas";

describe("QA Fixes: Formatting & Ingestion (BUG-009, BUG-010)", () => {
  describe("normalizeCityName", () => {
    it("normalizes lowercase city names to Title Case", () => {
      expect(normalizeCityName("mumbai")).toBe("Mumbai");
      expect(normalizeCityName("bengaluru")).toBe("Bengaluru");
    });

    it("normalizes ALL-CAPS city names to Title Case", () => {
      expect(normalizeCityName("MUMBAI")).toBe("Mumbai");
      expect(normalizeCityName("NEW DELHI")).toBe("New Delhi");
    });

    it("normalizes multi-word cities with extra spaces", () => {
      expect(normalizeCityName("   navi    mumbai   ")).toBe("Navi Mumbai");
    });

    it("normalizes hyphenated city names correctly", () => {
      expect(normalizeCityName("winston-salem")).toBe("Winston-Salem");
    });

    it("handles empty or blank input safely", () => {
      expect(normalizeCityName("")).toBe("");
      expect(normalizeCityName("   ")).toBe("");
    });
  });

  describe("formatCityName", () => {
    it("returns formatted city or fallback dash", () => {
      expect(formatCityName("pune")).toBe("Pune");
      expect(formatCityName("")).toBe("—");
      expect(formatCityName(null)).toBe("—");
      expect(formatCityName(undefined)).toBe("—");
    });
  });

  describe("formatStandardDateTime & formatStandardDate (BUG-009)", () => {
    it("formats ISO timestamps to standard IST date-time consistently", () => {
      // 2026-10-16T10:00:00.000Z is 15:30 (3:30 PM) IST
      const date = new Date("2026-10-16T10:00:00.000Z");
      const formatted = formatStandardDateTime(date);

      expect(formatted).toContain("16");
      expect(formatted).toContain("Oct");
      expect(formatted).toContain("2026");
      expect(formatted).toMatch(/0?3:30/);
    });

    it("formats dates to standard date without time", () => {
      const date = new Date("2026-10-16T10:00:00.000Z");
      const formatted = formatStandardDate(date);

      expect(formatted).toContain("16");
      expect(formatted).toContain("Oct");
      expect(formatted).toContain("2026");
      expect(formatted).not.toContain(":");
    });

    it("formats consultation date and time slot cleanly", () => {
      const date = new Date("2026-10-16T10:00:00.000Z");
      expect(formatConsultationSlot(date, "11:30 AM")).toContain("16 Oct 2026 at 11:30 AM");
      expect(formatConsultationSlot(null, null)).toBe("—");
    });
  });

  describe("Schema City Normalization (BUG-010)", () => {
    it("transforms city in CreateLeadSchema to Title Case automatically", () => {
      const result = CreateLeadSchema.safeParse({
        idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
        eventTypeSlug: "wedding",
        city: "mumbai",
        services: ["photography"],
        customerName: "Test User",
        phone: "+91 98765 43210",
        whatsappConsent: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe("Mumbai");
      }
    });

    it("transforms city in VendorRegisterSchema to Title Case automatically", () => {
      const result = VendorRegisterSchema.safeParse({
        phone: "+91 98765 43210",
        name: "Test Photography Studio",
        city: "new delhi",
        services: ["photography"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe("New Delhi");
      }
    });
  });

  describe("Production Site URL (BUG-001)", () => {
    it("provides a valid absolute URL for SITE_CONFIG.siteUrl", () => {
      expect(SITE_CONFIG.siteUrl).toBeDefined();
      expect(() => new URL(SITE_CONFIG.siteUrl)).not.toThrow();
    });
  });
});
