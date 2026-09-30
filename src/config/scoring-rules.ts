/**
 * MuggedMoments — Scoring Rules Configuration
 *
 * IMPORTANT: Scoring weights are marked CONFIGURATION_REQUIRED.
 * DO NOT invent production weights.
 * The engine runs but returns score=0 until weights are configured.
 *
 * Each rule has:
 * - ruleId: stable identifier used in scoring records
 * - condition: deterministic field check
 * - weight: CONFIGURATION_REQUIRED (currently 0 — business must approve)
 * - enabled: toggle without deleting rules
 * - reason: human-readable explanation
 * - version: increment when rules change to maintain reproducibility
 */

export interface ScoringRule {
  ruleId: string;
  condition: {
    field: string;
    operator: "exists" | "eq" | "gt" | "in" | "array_not_empty";
    value?: unknown;
  };
  weight: number; // CONFIGURATION_REQUIRED: all currently 0
  enabled: boolean;
  reason: string;
}

export const SCORING_RULES_VERSION = "1.0.0";

/**
 * CONFIGURATION_REQUIRED:
 * All weights are currently 0.
 * Business must provide approved weights before scoring is meaningful.
 * The engine structure is complete and will produce scores once weights
 * are configured.
 *
 * DO NOT invent weights. DO NOT fabricate scoring policy.
 */
export const SCORING_RULES: ScoringRule[] = [
  {
    ruleId: "event_type_present",
    condition: { field: "eventTypeId", operator: "exists" },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "Event type is specified",
  },
  {
    ruleId: "city_present",
    condition: { field: "city", operator: "exists" },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "City is specified",
  },
  {
    ruleId: "event_date_present",
    condition: { field: "eventDate", operator: "exists" },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "Event date is specified",
  },
  {
    ruleId: "guest_count_present",
    condition: { field: "guestCount", operator: "gt", value: 0 },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "Guest count is specified",
  },
  {
    ruleId: "budget_present",
    condition: { field: "budget", operator: "exists" },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "Budget is specified",
  },
  {
    ruleId: "services_present",
    condition: { field: "services", operator: "array_not_empty" },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "At least one service is selected",
  },
  {
    ruleId: "whatsapp_consent_given",
    condition: { field: "whatsappConsent", operator: "eq", value: true },
    weight: 0, // CONFIGURATION_REQUIRED
    enabled: true,
    reason: "WhatsApp consent provided",
  },
];

export function getEnabledRules(): ScoringRule[] {
  return SCORING_RULES.filter((r) => r.enabled);
}
