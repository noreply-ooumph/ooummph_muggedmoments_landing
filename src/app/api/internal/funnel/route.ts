/**
 * MuggedMoments — GET /api/internal/funnel?from=ISO&to=ISO
 *
 * Read-only JSON funnel report (Stage 14). No UI dashboard — explicitly out of scope,
 * see the Stage 8-14 work order. No auth is added here — this repo has no auth
 * mechanism anywhere yet; do not expose this publicly without adding one.
 */

import { NextRequest, NextResponse } from "next/server";
import { computeFunnelReport } from "@/domain/analytics/funnelService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam
    ? new Date(fromParam)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // default: trailing 30 days

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid from/to date.",
        },
      },
      { status: 400 }
    );
  }

  const report = await computeFunnelReport({ from, to });
  return NextResponse.json({ from: from.toISOString(), to: to.toISOString(), report });
}
