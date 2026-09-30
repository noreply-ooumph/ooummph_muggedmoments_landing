/**
 * MuggedMoments — POST /api/vendor/login
 *
 * Replaces the old phone -> OTP -> verify flow (removed per explicit request —
 * no code sent, no code checked). A vendor now enters only their phone number:
 *  - A vendor already exists for this phone -> a session is created here
 *    (server-side login) and { isNewVendor: false } is returned.
 *  - No vendor exists yet -> { isNewVendor: true } is returned, with no DB writes
 *    and no session — the client then shows the registration form, which
 *    completes account creation via POST /api/vendor/register.
 *
 * SECURITY NOTE: this removes phone-ownership verification from vendor
 * login/registration entirely — anyone who knows or guesses a phone number can
 * now log in as that vendor or register a new account under it. This was an
 * explicit, informed request, not an oversight; flagging it here in case that
 * changes later.
 *
 * Looks the vendor up via findVendorByPhone() (normalized fallback, not a bare
 * exact match) — see that function's doc comment for why: contactPhone is
 * stored exactly as typed, so a format mismatch between registration and a
 * later login would otherwise silently create a duplicate account.
 */

import { NextRequest, NextResponse } from "next/server";
import { VendorLoginSchema } from "@/lib/validation/schemas";
import { createVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import { findVendorByPhone } from "@/domain/vendorAuth/vendorLookupService";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parseResult = VendorLoginSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please enter a valid phone number.",
        },
      },
      { status: 422 }
    );
  }

  const { phone } = parseResult.data;

  try {
    const vendor = await findVendorByPhone(phone);

    if (!vendor) {
      return NextResponse.json({ isNewVendor: true }, { status: 200 });
    }

    await createVendorSession(vendor.id);
    await createAuditLog({
      entityType: "Vendor",
      entityId: vendor.id,
      action: "VENDOR_LOGIN_SUCCEEDED",
    });

    return NextResponse.json({ isNewVendor: false }, { status: 200 });
  } catch (error) {
    logger.error("Failed during vendor login lookup/session", {
      operation: "POST /api/vendor/login",
      errorCode: "VENDOR_LOGIN_FAILED",
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}
