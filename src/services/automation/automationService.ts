/**
 * MuggedMoments — Automation Execution Service
 *
 * Manages automation execution records for each pipeline step.
 * Each automation step has:
 * - Trigger
 * - Precondition
 * - Action
 * - Success
 * - Failure
 * - Retry Policy (via idempotent execution keys)
 * - Audit Record
 *
 * Idempotency: execution_key = leadId:automationType:version
 * Ensures same automation is not run twice for the same lead+version.
 */

import type { AutomationType } from "@/types";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { buildAutomationExecutionKey } from "@/lib/idempotency";
import { createAuditLog } from "@/domain/audit/auditService";

type AutomationExecutionOptions = {
  leadId: string;
  automationType: AutomationType;
  version?: string;
};

type AutomationRunResult<T> =
  | { status: "SUCCEEDED"; result: T }
  | { status: "FAILED"; error: string }
  | { status: "SKIPPED"; reason: string };

/**
 * Runs an automation step with idempotency protection.
 * If the execution key already exists with SUCCEEDED status, skips.
 * Creates execution records for observability.
 */
export async function runAutomation<T>(
  options: AutomationExecutionOptions,
  action: () => Promise<T>
): Promise<AutomationRunResult<T>> {
  const { leadId, automationType, version = "1" } = options;
  const executionKey = buildAutomationExecutionKey(
    leadId,
    automationType,
    version
  );

  // Check for existing execution — idempotency
  const existing = await prisma.automationExecution.findUnique({
    where: { executionKey },
  });

  if (existing?.status === "SUCCEEDED") {
    logger.info("Automation already succeeded, skipping", {
      operation: "runAutomation",
      leadId,
      automationType,
      executionKey,
    });
    return {
      status: "SKIPPED",
      reason: `${automationType} already completed for this lead.`,
    };
  }

  // Create or update execution record
  const execution = await prisma.automationExecution.upsert({
    where: { executionKey },
    create: {
      leadId,
      automationType,
      executionKey,
      status: "RUNNING",
      startedAt: new Date(),
    },
    update: {
      status: "RUNNING",
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });

  await createAuditLog({
    entityType: "Lead",
    entityId: leadId,
    action: "AUTOMATION_STARTED",
    metadata: { automationType, executionKey },
  });

  const startTime = Date.now();

  try {
    const result = await action();
    const durationMs = Date.now() - startTime;

    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
      },
    });

    await createAuditLog({
      entityType: "Lead",
      entityId: leadId,
      action: "AUTOMATION_SUCCEEDED",
      metadata: { automationType, executionKey, durationMs },
    });

    logger.info("Automation succeeded", {
      operation: "runAutomation",
      leadId,
      automationType,
      durationMs,
    });

    return { status: "SUCCEEDED", result };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorCode: "AUTOMATION_FAILED",
        errorMessage: errorMessage.slice(0, 500), // cap message length
      },
    });

    await createAuditLog({
      entityType: "Lead",
      entityId: leadId,
      action: "AUTOMATION_FAILED",
      metadata: { automationType, executionKey, durationMs, errorMessage },
    });

    logger.error("Automation failed", {
      operation: "runAutomation",
      leadId,
      automationType,
      durationMs,
      errorCode: "AUTOMATION_FAILED",
    });

    return { status: "FAILED", error: errorMessage };
  }
}
