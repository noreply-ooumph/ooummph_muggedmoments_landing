/**
 * MuggedMoments — Follow-Up / Reminder Engine (Stage 13)
 *
 * Deterministic, state-driven reminder eligibility — NOT time-based spam.
 * No AI. No subjective model.
 *
 * Only INCOMPLETE leads (never finished their requirement) and QUALIFIED leads with
 * no eligible vendor yet (QUALIFIED but not yet ROUTED) are ever reminder-eligible.
 * A lead that reaches COMPLETE-without-being-qualified doesn't exist in this system
 * (see qualificationService — COMPLETE auto-promotes to QUALIFIED), ROUTED leads have
 * already gotten what a reminder exists to produce, and CAPTURED is a transient
 * same-request state that never persists long enough to need a reminder.
 *
 * Reminder count is derived from existing AutomationExecution rows (SUCCEEDED,
 * automationType = "INCOMPLETE_REMINDER") rather than a separate counter column —
 * one source of truth, reusing infrastructure that already exists.
 */

import type { QualificationStatus } from "@prisma/client";

// CONFIGURATION_REQUIRED: no business-approved reminder cadence exists yet. These are
// placeholder thresholds only — business must approve actual delays before this fires
// against real customers. Index 0 = delay before the 1st reminder, index 1 = delay
// before the 2nd (measured from Lead.updatedAt, i.e. since the last state change).
//
// PRE-LAUNCH GATE (elevated from "dormant placeholder" to "real risk" once
// vercel.json's cron was wired up): this logic previously never ran against real
// customers because nothing ever called /api/internal/run-reminders. Now that Vercel
// Cron calls it daily, the only thing still preventing it from messaging real leads on
// these unapproved 24h/72h delays is that WhatsApp has no real provider configured yet
// (see lib/whatsapp/index.ts) — sends silently no-op until then. The day a real
// WhatsApp provider is wired, these thresholds go live with it. Get explicit business
// sign-off on the actual cadence before that happens — do not let provider
// configuration be the thing that accidentally activates this.
const REMINDER_DELAY_THRESHOLDS_MS = [
  24 * 60 * 60 * 1000, // 24h before 1st reminder
  72 * 60 * 60 * 1000, // 72h before 2nd reminder
];

const MAX_REMINDERS = REMINDER_DELAY_THRESHOLDS_MS.length;

const REMINDER_ELIGIBLE_STATUSES: readonly QualificationStatus[] = [
  "INCOMPLETE",
  "QUALIFIED",
];

export interface DueReminder {
  version: string;
  reason: string;
}

/**
 * Returns the due reminder for this lead, or null if none is due right now.
 * `reminderCountSent` = number of previously SUCCEEDED "INCOMPLETE_REMINDER"
 * automation executions for this lead (query it via AutomationExecution — see
 * the caller in the run-reminders route).
 */
export function getDueReminder(
  lead: { qualificationStatus: QualificationStatus; updatedAt: Date },
  reminderCountSent: number,
  now: Date
): DueReminder | null {
  if (!REMINDER_ELIGIBLE_STATUSES.includes(lead.qualificationStatus)) {
    return null;
  }

  // Explicit stop condition — never send more than MAX_REMINDERS.
  if (reminderCountSent >= MAX_REMINDERS) {
    return null;
  }

  const threshold = REMINDER_DELAY_THRESHOLDS_MS[reminderCountSent];
  const elapsedMs = now.getTime() - lead.updatedAt.getTime();

  if (elapsedMs < threshold) {
    return null;
  }

  return {
    version: String(reminderCountSent + 1),
    reason:
      lead.qualificationStatus === "INCOMPLETE"
        ? "Requirement still incomplete"
        : "Qualified but no eligible vendor found yet",
  };
}
