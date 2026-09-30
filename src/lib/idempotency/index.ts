/**
 * MuggedMoments — Idempotency Key Management
 *
 * Used to prevent duplicate lead creation on retry/refresh/double-submit.
 * Keys must be UUIDs generated client-side and sent with each submission.
 *
 * Backend stores the key and rejects duplicate requests with 409.
 * A retry with the same key returns the original result (idempotent).
 *
 * This module handles key generation (client-side) and construction
 * of deterministic execution keys for automation steps.
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Generates a new idempotency key for a lead submission.
 * Must be called once per form session and stored with the form state.
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Constructs a deterministic execution key for an automation step.
 * Format: {leadId}:{automationType}:{version}
 *
 * This ensures that retrying the same automation step for the same
 * lead and version does not create duplicate execution records.
 */
export function buildAutomationExecutionKey(
  leadId: string,
  automationType: string,
  version: string = "1"
): string {
  return `${leadId}:${automationType}:${version}`;
}

/**
 * Generates a public lead ID in format: MM-XXXXXXXX
 * Uses random alphanumeric characters (uppercase).
 * Uniqueness is guaranteed at the database level via unique constraint.
 */
export function generatePublicLeadId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MM-${suffix}`;
}

/**
 * Generates a public booking ID in format: BK-XXXXXXXX
 * Same algorithm as generatePublicLeadId(), distinct prefix so it's never
 * confused with a Lead's public ID when both appear on the same page.
 * Uniqueness is guaranteed at the database level via unique constraint.
 */
export function generatePublicBookingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${suffix}`;
}
