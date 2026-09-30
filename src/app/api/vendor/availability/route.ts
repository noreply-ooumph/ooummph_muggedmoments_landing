/**
 * MuggedMoments — /api/vendor/availability
 *
 * Session-gated (getVendorSession()) — same convention as every other
 * /api/vendor/* route. Lets a vendor self-declare AVAILABLE/UNAVAILABLE for a
 * date (POST), remove a self-reported date back to UNKNOWN (DELETE), or list
 * their own upcoming availability rows (GET) — see availabilityService.ts's
 * setVendorAvailability()/clearVendorAvailability()/listVendorAvailability()
 * for the full trust-model reasoning (in particular: never overwrites a date
 * that already has a real confirmed booking).
 */

import { NextRequest, NextResponse } from "next/server";
import { getVendorSession } from "@/lib/vendorSession";
import {
  setVendorAvailability,
  clearVendorAvailability,
  listVendorAvailability,
} from "@/domain/availability/availabilityService";
import {
  VendorAvailabilityPatchSchema,
  VendorAvailabilityDeleteSchema,
} from "@/lib/validation/schemas";
import { toApiErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const rows = await listVendorAvailability(session.vendorId);
  return NextResponse.json(
    {
      dates: rows.map((r) => ({
        date: r.date.toISOString(),
        status: r.status,
        source: r.source,
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = VendorAvailabilityPatchSchema.safeParse(body);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path.join(".");
      if (field && !fields[field]) fields[field] = issue.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields.",
          fields,
        },
      },
      { status: 422 }
    );
  }

  try {
    const result = await setVendorAvailability(
      session.vendorId,
      new Date(parseResult.data.date),
      parseResult.data.status
    );
    return NextResponse.json(
      { date: result.date.toISOString(), status: result.status },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to set vendor availability", {
      operation: "POST /api/vendor/availability",
      vendorId: session.vendorId,
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = VendorAvailabilityDeleteSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please provide a valid date." } },
      { status: 422 }
    );
  }

  try {
    await clearVendorAvailability(session.vendorId, new Date(parseResult.data.date));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error("Failed to clear vendor availability", {
      operation: "DELETE /api/vendor/availability",
      vendorId: session.vendorId,
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
