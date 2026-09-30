/**
 * MuggedMoments — Audit Domain Service
 *
 * Records immutable audit entries for all important state-changing actions.
 * Audit records must not store unnecessary sensitive data.
 */

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export type AuditAction =
  | "LEAD_CREATED"
  | "LEAD_UPDATED"
  | "ATTRIBUTION_CAPTURED"
  | "COMPLETENESS_CALCULATED"
  | "SCORE_CALCULATED"
  | "MATCHING_EXECUTED"
  | "AVAILABILITY_FILTERED"
  | "QUALIFICATION_STATUS_CHANGED"
  | "AUTOMATION_STARTED"
  | "AUTOMATION_SUCCEEDED"
  | "AUTOMATION_FAILED"
  | "VENDOR_REGISTERED"
  | "VENDOR_LOGIN_SUCCEEDED"
  | "VENDOR_LOGIN_FAILED"
  | "VENDOR_PROFILE_UPDATED"
  | "VENDOR_PORTFOLIO_ITEM_ADDED"
  | "VENDOR_PORTFOLIO_ITEM_REMOVED"
  | "VENDOR_DOCUMENT_ADDED"
  | "VENDOR_DOCUMENT_REMOVED"
  | "VENDOR_OPPORTUNITY_CREATED"
  | "VENDOR_OPPORTUNITY_VIEWED"
  | "VENDOR_OPPORTUNITY_INTERESTED"
  | "VENDOR_OPPORTUNITY_DECLINED"
  | "VENDOR_QUOTE_DRAFT_STARTED"
  | "VENDOR_QUOTE_SUBMITTED"
  | "VENDOR_QUOTE_REVISION_STARTED"
  | "VENDOR_QUOTE_REVISION_DISCARDED"
  | "QUOTE_MESSAGE_SENT"
  | "BOOKING_REQUEST_CREATED"
  | "BOOKING_REQUEST_ACCEPTED"
  | "BOOKING_REQUEST_REJECTED"
  | "BOOKING_CANCELLED"
  | "VENDOR_VERIFICATION_APPROVED"
  | "VENDOR_VERIFICATION_REJECTED"
  | "VENDOR_BACKFILL_MATCHING_EXECUTED"
  | "VENDOR_AVAILABILITY_SET";

export type AuditActorType = "SYSTEM" | "USER" | "API";

interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorType?: AuditActorType;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an audit log entry.
 * Failures are logged but do not throw — audit logging must not
 * break core business operations.
 */
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorType: entry.actorType ?? "SYSTEM",
        metadata: (entry.metadata as any) ?? {},
      },
    });
  } catch (error) {
    // Audit log failure must not break business operations
    logger.error("Failed to create audit log entry", {
      operation: "createAuditLog",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      errorCode: "AUDIT_WRITE_FAILED",
    });
  }
}
