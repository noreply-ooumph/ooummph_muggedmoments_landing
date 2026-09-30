/**
 * MuggedMoments — Completeness Domain Service
 *
 * Deterministic completeness evaluation.
 * No scoring. No AI. No subjective model.
 *
 * Returns COMPLETE or INCOMPLETE with structured missing fields.
 * Rules are defined in config/completeness-rules.ts.
 * Rules are auditable and configurable.
 */

import type { CompletenessResult } from "@/types";
import {
  getAllRules,
  type CompletenessRule,
} from "@/config/completeness-rules";

type LeadData = {
  eventTypeId?: string | null;
  city?: string | null;
  eventDate?: Date | null;
  guestCount?: number | null;
  budget?: string | null;
  services?: string[];
  customerName?: string | null;
  phone?: string | null;
  whatsappConsent?: boolean | null;
};

/**
 * Evaluates whether a field value is considered "present".
 * A value is present when:
 * - It is not null/undefined
 * - If string, it is not empty
 * - If array, it has at least one element
 */
function isFieldPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true; // booleans are always "present"
  if (typeof value === "number") return !isNaN(value);
  return Boolean(value);
}

/**
 * Evaluates whether a conditional field is required given the lead data.
 */
function isConditionMet(
  rule: CompletenessRule,
  leadData: LeadData
): boolean {
  if (!rule.condition) return true; // no condition = always applies

  const { field, operator, value } = rule.condition;
  const fieldValue = leadData[field as keyof LeadData];

  switch (operator) {
    case "exists":
      return isFieldPresent(fieldValue);
    case "eq":
      return fieldValue === value;
    case "neq":
      return fieldValue !== value;
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    case "nin":
      return Array.isArray(value) && !value.includes(fieldValue);
    default:
      return false;
  }
}

/**
 * Runs the completeness evaluation against provided lead data.
 * Returns a structured result with COMPLETE or INCOMPLETE status
 * and exact list of missing fields.
 */
export function evaluateCompleteness(leadData: LeadData): CompletenessResult {
  const rules = getAllRules();
  const missingFields: string[] = [];
  const checkedFields: string[] = [];

  for (const rule of rules) {
    if (rule.requirement === "optional") {
      // Optional fields are checked but never count as missing
      checkedFields.push(rule.field);
      continue;
    }

    if (rule.requirement === "conditional") {
      // Only required if condition is met
      if (!isConditionMet(rule, leadData)) {
        continue; // condition not met — field not required
      }
    }

    checkedFields.push(rule.field);
    const value = leadData[rule.field as keyof LeadData];

    if (!isFieldPresent(value)) {
      missingFields.push(rule.field);
    }
  }

  return {
    status: missingFields.length === 0 ? "COMPLETE" : "INCOMPLETE",
    missingFields,
    checkedFields,
  };
}
