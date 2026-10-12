/**
 * MuggedMoments — POST /api/internal/leads/[publicLeadId]/call-log
 *
 * Admin-only. Records a representative's call disposition/note against a lead
 * as an AuditLog entry (AdminLeadDetailCard's "Representative Consultation &
 * Call Hub") -- deliberately append-only history, not a Lead field, since a
 * call log is a sequence of events, not current-state data. Covered by
 * proxy.ts's Basic Auth gate (/api/internal/:path*); no separate auth check
 * here, same convention as the sibling PATCH/DELETE routes.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { createAuditLog } from "@/domain/audit/auditService";
import { AdminLeadCallLogSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicLeadId: string }> }
): Promise<NextResponse> {
  const { publicLeadId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = AdminLeadCallLogSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message ?? "Invalid call log entry.",
        },
      },
      { status: 422 }
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json(
      { error: { code: "LEAD_NOT_FOUND", message: "Lead not found." } },
      { status: 404 }
    );
  }

  const { callStatus, note } = parseResult.data;
  const loggedAt = new Date().toISOString();

  await createAuditLog({
    entityType: "Lead",
    entityId: lead.id,
    action: "LEAD_CALL_LOGGED",
    actorType: "USER",
    metadata: { callStatus, note: note || null },
  });

  logger.info("Admin logged a representative call entry", {
    operation: "POST /api/internal/leads/:publicLeadId/call-log",
    publicLeadId,
    callStatus,
  });

  return NextResponse.json({ callStatus, note: note ?? null, loggedAt }, { status: 201 });
}
