/**
 * MuggedMoments — Vendor Matching Domain Service
 *
 * DETERMINISTIC matching. NO AI. NO LLM. NO subjective ranking.
 *
 * Matching flow:
 * 1. Compatibility match (city, event_type, service dimensions)
 * 2. Availability filter (AVAILABLE / UNAVAILABLE / UNKNOWN)
 *
 * CRITICAL RULES:
 * - Do NOT label vendors BEST/TOP/RECOMMENDED
 * - Do NOT infer service support from vendor names
 * - Do NOT invent vendor capabilities
 * - Only activate dimensions that have corresponding data
 * - Return explainable results with reasons
 * - UNKNOWN availability remains UNKNOWN — never promoted to AVAILABLE
 */

import type { VendorMatchResult, MatchingResult } from "@/types";
import { MATCHING_CONFIG, MATCHING_REASONS } from "@/config/matching-rules";
import { checkVendorsAvailability } from "@/domain/availability/availabilityService";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

type MatchInput = {
  leadId: string;
  eventTypeSlug: string;
  city: string;
  eventDate?: Date | null;
  services: string[]; // service slugs
};

type VendorCandidate = {
  id: string;
  name: string;
  city: string;
  active: boolean;
  profileComplete: boolean;
  services: {
    service: { slug: string };
    eventTypes: string[];
  }[];
};

/**
 * Evaluates compatibility between a lead and a vendor candidate.
 * Returns { eligible, reasons }.
 *
 * Reasons are explicit strings — not labels of quality/ranking.
 */
export function evaluateCompatibility(
  vendor: VendorCandidate,
  input: MatchInput
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!vendor.active) {
    return { eligible: false, reasons: [MATCHING_REASONS.VENDOR_INACTIVE] };
  }

  const { activeDimensions, minimumMatchCount } = MATCHING_CONFIG;
  let matchCount = 0;

  // DIMENSION: City
  if (activeDimensions.includes("city")) {
    const cityMatch =
      vendor.city.toLowerCase().trim() === input.city.toLowerCase().trim();
    if (cityMatch) {
      reasons.push(MATCHING_REASONS.CITY_MATCH);
      matchCount++;
    } else {
      reasons.push(MATCHING_REASONS.CITY_MISMATCH);
    }
  }

  // DIMENSION: Event Type
  // Skipped entirely for "other" — a customer-typed custom event (see
  // Lead.customEventTypeName) has no fixed category any vendor could have
  // pre-declared support for in VendorService.eventTypes. Treating it as a
  // mismatch would silently zero out matching for every "Other" lead; simply
  // not counting this dimension lets city/service still decide eligibility.
  if (activeDimensions.includes("event_type") && input.eventTypeSlug !== "other") {
    const vendorServiceSlugs = vendor.services.flatMap((vs) => vs.eventTypes);
    const eventTypeMatch = vendorServiceSlugs.includes(input.eventTypeSlug);
    if (eventTypeMatch) {
      reasons.push(MATCHING_REASONS.EVENT_TYPE_MATCH);
      matchCount++;
    } else {
      reasons.push(MATCHING_REASONS.EVENT_TYPE_MISMATCH);
    }
  }

  // DIMENSION: Service
  if (activeDimensions.includes("service") && input.services.length > 0) {
    const vendorServiceSlugs = vendor.services.map((vs) => vs.service.slug);
    const hasAnyService = input.services.some((s) =>
      vendorServiceSlugs.includes(s)
    );
    if (hasAnyService) {
      reasons.push(MATCHING_REASONS.SERVICE_MATCH);
      matchCount++;
    } else {
      reasons.push(MATCHING_REASONS.SERVICE_MISMATCH);
    }
  }

  // DIMENSION: Profile Complete
  if (activeDimensions.includes("profile_complete")) {
    if (!vendor.profileComplete) {
      reasons.push(MATCHING_REASONS.PROFILE_INCOMPLETE);
    }
  }

  // All active vendors are eligible to match with all customer lead requests without filtering by city or money/budget.
  const eligible = vendor.active;
  return { eligible, reasons };
}

/**
 * Runs the full matching pipeline for a lead:
 * 1. Fetch all active vendors
 * 2. Evaluate compatibility per vendor
 * 3. Filter availability for eligible vendors
 * 4. Return structured results
 *
 * Results are explainable — each vendor result includes reasons.
 * No ranking labels (BEST/TOP/RECOMMENDED) are applied.
 */
export async function runMatching(
  input: MatchInput
): Promise<MatchingResult> {
  logger.info("Starting vendor matching", {
    operation: "runMatching",
    leadId: input.leadId,
  });

  const vendors = await prisma.vendor.findMany({
    where: { active: true },
    include: {
      services: {
        include: {
          service: {
            select: { slug: true },
          },
        },
      },
    },
  });

  const compatibilityResults: VendorMatchResult[] = [];
  const eligibleVendorIds: string[] = [];

  for (const vendor of vendors) {
    const { eligible, reasons } = evaluateCompatibility(vendor, input);
    compatibilityResults.push({
      vendorId: vendor.id,
      eligible,
      reasons,
      availability: "UNKNOWN", // set after availability check
    });
    if (eligible) {
      eligibleVendorIds.push(vendor.id);
    }
  }

  // Availability filter — only for eligible vendors with a known event date
  let availabilityMap = new Map<string, "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN">();

  if (input.eventDate && eligibleVendorIds.length > 0) {
    availabilityMap = await checkVendorsAvailability(
      eligibleVendorIds,
      input.eventDate
    );
  }

  // Merge availability into results
  const finalResults: VendorMatchResult[] = compatibilityResults.map((r) => {
    if (!r.eligible) return r;
    const avail = availabilityMap.get(r.vendorId) ?? "UNKNOWN";
    return { ...r, availability: avail };
  });

  const eligibleCount = finalResults.filter((r) => r.eligible).length;

  logger.info("Vendor matching complete", {
    operation: "runMatching",
    leadId: input.leadId,
    totalVendors: vendors.length,
    eligibleCount,
  });

  return {
    leadId: input.leadId,
    matches: finalResults,
    eligibleCount,
    executedAt: new Date().toISOString(),
  };
}
