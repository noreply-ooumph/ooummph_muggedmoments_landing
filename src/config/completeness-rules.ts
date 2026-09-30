/**
 * MuggedMoments — Completeness Rules Configuration
 *
 * Defines which fields are required, optional, or conditionally required.
 * Rules are deterministic — no scoring weights here.
 *
 * CONFIGURATION_REQUIRED: Review field requirements with business
 * before production launch.
 */

export type FieldRequirement = "required" | "optional" | "conditional";

export interface CompletenessRule {
  field: string;
  requirement: FieldRequirement;
  /**
   * For conditional fields: condition that must be true for the field
   * to be required. If null, field is always required/optional.
   */
  condition?: {
    field: string;
    operator: "eq" | "neq" | "in" | "nin" | "exists";
    value?: unknown;
  };
  label: string; // Human-readable field label for error reporting
}

/**
 * CONFIGURATION_REQUIRED: Confirm required/optional status with business.
 */
export const COMPLETENESS_RULES: CompletenessRule[] = [
  { field: "eventTypeId", requirement: "required", label: "Event Type" },
  { field: "city", requirement: "required", label: "City" },
  { field: "eventDate", requirement: "required", label: "Event Date" },
  {
    field: "guestCount",
    requirement: "optional",
    label: "Guest Count",
  }, // CONFIGURATION_REQUIRED: confirm with business
  {
    field: "budget",
    requirement: "optional",
    label: "Budget",
  }, // CONFIGURATION_REQUIRED: confirm budget tier policy with business
  {
    field: "services",
    requirement: "required",
    label: "Services Needed",
  },
  { field: "customerName", requirement: "required", label: "Your Name" },
  { field: "phone", requirement: "required", label: "Phone Number" },
  {
    field: "whatsappConsent",
    requirement: "optional",
    label: "WhatsApp Consent",
  },
];

export function getRequiredFields(): CompletenessRule[] {
  return COMPLETENESS_RULES.filter((r) => r.requirement === "required");
}

export function getAllRules(): CompletenessRule[] {
  return COMPLETENESS_RULES;
}
