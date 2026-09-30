/**
 * MuggedMoments — GET /api/internal/leads
 *
 * Admin panel MVP. Covered by middleware.ts's Basic Auth gate — no separate
 * auth check here by design.
 */

import { NextResponse } from "next/server";
import { listLeadsForAdmin } from "@/services/lead/leadService";
import { toApiErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse> {
  try {
    const leads = await listLeadsForAdmin();
    return NextResponse.json({ leads }, { status: 200 });
  } catch (error) {
    logger.error("Failed to list leads for admin", {
      operation: "GET /api/internal/leads",
    });
    const { body, status } = toApiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
