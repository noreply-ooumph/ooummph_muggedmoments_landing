/**
 * MuggedMoments — Matching Rules Configuration
 *
 * Defines which dimensions are active for vendor matching.
 * Only activate a dimension when corresponding data actually exists
 * in the vendor data model.
 *
 * CONFIGURATION_REQUIRED: Confirm matching dimensions with business.
 */

export type MatchDimension =
  | "city"
  | "event_type"
  | "service"
  | "profile_complete";

export interface MatchingConfig {
  activeDimensions: MatchDimension[];
  /**
   * Minimum number of dimensions that must match for a vendor to be
   * considered eligible. CONFIGURATION_REQUIRED.
   */
  minimumMatchCount: number;
}

/**
 * CONFIGURATION_REQUIRED:
 * Currently activates city, event_type, and service dimensions.
 * Budget compatibility dimension is NOT active — requires budget tier
 * definitions from business before it can be used.
 * Vendor ranking logic is NOT implemented — DO NOT label vendors
 * BEST/TOP/RECOMMENDED without an approved ranking system.
 */
export const MATCHING_CONFIG: MatchingConfig = {
  activeDimensions: ["city", "event_type", "service"],
  minimumMatchCount: 1,
};

export const MATCHING_REASONS = {
  CITY_MATCH: "CITY_MATCH",
  CITY_MISMATCH: "CITY_MISMATCH",
  EVENT_TYPE_MATCH: "EVENT_TYPE_MATCH",
  EVENT_TYPE_MISMATCH: "EVENT_TYPE_MISMATCH",
  SERVICE_MATCH: "SERVICE_MATCH",
  SERVICE_MISMATCH: "SERVICE_MISMATCH",
  PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
  VENDOR_INACTIVE: "VENDOR_INACTIVE",
} as const;
