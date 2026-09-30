/**
 * MuggedMoments — Scoring Domain Service
 *
 * DETERMINISTIC scoring engine. NO LLM. NO AI. NO subjective model.
 *
 * Rules are configured in config/scoring-rules.ts.
 * All weights are currently 0 (CONFIGURATION_REQUIRED).
 * The engine is fully functional — scores will be meaningful once
 * business approves and configures weights.
 *
 * The score is REPRODUCIBLE:
 * Same lead data + same rule set = same score.
 *
 * Returns: { score, matchedRules, scoreVersion }
 */

import type { ScoringResult, ScoredRule } from "@/types";
import {
  getEnabledRules,
  SCORING_RULES_VERSION,
  type ScoringRule,
} from "@/config/scoring-rules";

type ScoringInput = {
  eventTypeId?: string | null;
  city?: string | null;
  eventDate?: Date | null;
  guestCount?: number | null;
  budget?: string | null;
  services?: string[];
  whatsappConsent?: boolean | null;
};

/**
 * Evaluates a single scoring rule condition against the lead data.
 * Returns true if the condition is matched (rule contributes its weight).
 */
function evaluateCondition(
  rule: ScoringRule,
  data: ScoringInput
): boolean {
  const { field, operator, value } = rule.condition;
  const fieldValue = data[field as keyof ScoringInput];

  switch (operator) {
    case "exists":
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === "string") return fieldValue.trim().length > 0;
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      return Boolean(fieldValue);

    case "eq":
      return fieldValue === value;

    case "gt":
      return typeof fieldValue === "number" && fieldValue > (value as number);

    case "in":
      return Array.isArray(value) && value.includes(fieldValue);

    case "array_not_empty":
      return Array.isArray(fieldValue) && fieldValue.length > 0;

    default:
      return false;
  }
}

/**
 * Runs the scoring engine against the provided lead data.
 *
 * NOTE: All weights are currently 0 (CONFIGURATION_REQUIRED).
 * The engine structure and matching logic are complete.
 * Scores will be non-zero once business configures weights.
 */
export function calculateScore(data: ScoringInput): ScoringResult {
  const rules = getEnabledRules();
  const matchedRules: ScoredRule[] = [];
  let totalScore = 0;

  for (const rule of rules) {
    const matched = evaluateCondition(rule, data);
    if (matched) {
      matchedRules.push({
        ruleId: rule.ruleId,
        weight: rule.weight,
        reason: rule.reason,
      });
      totalScore += rule.weight;
    }
  }

  return {
    score: totalScore,
    matchedRules,
    scoreVersion: SCORING_RULES_VERSION,
  };
}
