/**
 * MuggedMoments — Qualification State Machine (Stage 9)
 *
 * Deterministic transition table. No AI. No subjective model.
 *
 * Tracks qualification progress separately from Lead.status (the coarse lifecycle
 * enum). This is intentionally a parallel concept living in its own LeadQualification
 * row, not a replacement for Lead.status.
 *
 * Transition table (resolved from the shared plan's ASCII diagram — see work order):
 *   (none)                 -> created                         => CAPTURED
 *   CAPTURED                -> completeness INCOMPLETE          => INCOMPLETE
 *   CAPTURED                -> completeness COMPLETE            => COMPLETE
 *   INCOMPLETE              -> customer resumes (external call) => QUALIFICATION_PENDING
 *   QUALIFICATION_PENDING   -> re-evaluated, still INCOMPLETE    => INCOMPLETE
 *   QUALIFICATION_PENDING   -> re-evaluated, now COMPLETE        => COMPLETE
 *   COMPLETE                -> immediately (same request)       => QUALIFIED
 *     CONFIGURATION_REQUIRED: scoring weights are currently all 0 (scoring-rules.ts),
 *     so a score-threshold gate would be meaningless today. Auto-promote for now.
 *     Once weights are business-approved, gate this behind `score >= <approved threshold>`.
 *   QUALIFIED                -> matching run, eligibleCount > 0  => ROUTED
 *   QUALIFIED                -> matching run, eligibleCount = 0  => QUALIFIED (unchanged)
 *
 * MATCHING exists as a stored value for symmetry with AutomationStatus.RUNNING (a real,
 * observable-in-principle state), but since the whole pipeline runs synchronously within
 * one request today, no code path here ever assigns it — it is not dead code so much as
 * a value reserved for a future asynchronous matching implementation.
 */

import type { QualificationStatus } from "@prisma/client";
import type { CompletenessStatus } from "@/types";

export function deriveNextStatus(
  current: QualificationStatus,
  input: {
    // "PENDING" is CompletenessResult's initial-state placeholder — evaluateCompleteness
    // never actually returns it, but the type is accepted here and treated as "no
    // signal" (falls through unchanged) for safety rather than requiring a cast at
    // every call site.
    completenessStatus?: CompletenessStatus;
    eligibleMatchCount?: number;
  }
): QualificationStatus {
  const { completenessStatus, eligibleMatchCount } = input;

  if (
    (current === "CAPTURED" || current === "QUALIFICATION_PENDING") &&
    completenessStatus === "INCOMPLETE"
  ) {
    return "INCOMPLETE";
  }

  if (
    (current === "CAPTURED" || current === "QUALIFICATION_PENDING") &&
    completenessStatus === "COMPLETE"
  ) {
    return "COMPLETE";
  }

  if (current === "COMPLETE") {
    // CONFIGURATION_REQUIRED: auto-promotion until scoring weights are approved.
    return "QUALIFIED";
  }

  if (current === "QUALIFIED" && typeof eligibleMatchCount === "number") {
    return eligibleMatchCount > 0 ? "ROUTED" : "QUALIFIED";
  }

  return current;
}

/**
 * Marks an INCOMPLETE lead as re-entering qualification (the customer has submitted
 * the missing fields and re-evaluation is about to run). Pure state transition — the
 * caller is responsible for actually re-running completeness afterward.
 */
export function beginResume(current: QualificationStatus): QualificationStatus {
  if (current !== "INCOMPLETE") return current;
  return "QUALIFICATION_PENDING";
}
