/**
 * MuggedMoments — Unit Tests: Vendor Portfolio Domain Logic
 */

import { describe, it, expect } from "vitest";
import {
  isAllowedPortfolioMimeType,
  isWithinPortfolioFileSizeLimit,
  isUnderPortfolioItemLimit,
  extensionForMimeType,
  buildPortfolioImagePath,
  MAX_PORTFOLIO_FILE_SIZE_BYTES,
  MAX_PORTFOLIO_ITEMS_PER_VENDOR,
} from "@/domain/vendorProfile/portfolioService";

describe("Portfolio Service — isAllowedPortfolioMimeType", () => {
  it("accepts image/jpeg", () => {
    expect(isAllowedPortfolioMimeType("image/jpeg")).toBe(true);
  });

  it("accepts image/png", () => {
    expect(isAllowedPortfolioMimeType("image/png")).toBe(true);
  });

  it("accepts image/webp", () => {
    expect(isAllowedPortfolioMimeType("image/webp")).toBe(true);
  });

  it("rejects a disallowed mime type", () => {
    expect(isAllowedPortfolioMimeType("text/plain")).toBe(false);
  });

  it("rejects image/gif (not in the allow-list)", () => {
    expect(isAllowedPortfolioMimeType("image/gif")).toBe(false);
  });
});

describe("Portfolio Service — isWithinPortfolioFileSizeLimit", () => {
  it("accepts a file exactly at the 5MB boundary", () => {
    expect(isWithinPortfolioFileSizeLimit(MAX_PORTFOLIO_FILE_SIZE_BYTES)).toBe(true);
  });

  it("rejects a file one byte over the boundary", () => {
    expect(isWithinPortfolioFileSizeLimit(MAX_PORTFOLIO_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  it("accepts a small file", () => {
    expect(isWithinPortfolioFileSizeLimit(1024)).toBe(true);
  });
});

describe("Portfolio Service — isUnderPortfolioItemLimit", () => {
  it("is true below the cap", () => {
    expect(isUnderPortfolioItemLimit(MAX_PORTFOLIO_ITEMS_PER_VENDOR - 1)).toBe(true);
  });

  it("is false at the cap", () => {
    expect(isUnderPortfolioItemLimit(MAX_PORTFOLIO_ITEMS_PER_VENDOR)).toBe(false);
  });

  it("is false above the cap", () => {
    expect(isUnderPortfolioItemLimit(MAX_PORTFOLIO_ITEMS_PER_VENDOR + 1)).toBe(false);
  });
});

describe("Portfolio Service — extensionForMimeType", () => {
  it("maps image/jpeg to .jpg", () => {
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
  });

  it("maps image/png to .png", () => {
    expect(extensionForMimeType("image/png")).toBe(".png");
  });

  it("maps image/webp to .webp", () => {
    expect(extensionForMimeType("image/webp")).toBe(".webp");
  });
});

describe("Portfolio Service — buildPortfolioImagePath", () => {
  it("builds a host-agnostic relative path with no traversal-unsafe segments", () => {
    const path = buildPortfolioImagePath(
      "vendor-uuid-123",
      "file-uuid-456",
      "image/jpeg"
    );
    expect(path).toBe("/uploads/vendor-portfolio/vendor-uuid-123/file-uuid-456.jpg");
    expect(path).not.toContain("..");
    expect(path).not.toContain("http");
  });

  it("uses the correct extension per mime type", () => {
    expect(buildPortfolioImagePath("v1", "f1", "image/png")).toBe(
      "/uploads/vendor-portfolio/v1/f1.png"
    );
    expect(buildPortfolioImagePath("v1", "f1", "image/webp")).toBe(
      "/uploads/vendor-portfolio/v1/f1.webp"
    );
  });
});
