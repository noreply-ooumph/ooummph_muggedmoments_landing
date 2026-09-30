/**
 * MuggedMoments — POST /api/vendor/register
 *
 * Completes vendor registration. Phone-number-only (no OTP) — see
 * src/app/api/vendor/login/route.ts's header comment for why and the security
 * note it carries; this route creates a new account directly off the submitted
 * phone number, no code sent or checked.
 *
 * Creates the Vendor (verificationStatus: PENDING — never auto-verified),
 * its VendorService rows, and a session (auto-login after registration).
 *
 * The pre-registration duplicate check uses findVendorByPhone() (normalized
 * fallback), not a bare exact match on contactPhone — an exact match here
 * would miss an existing vendor whose number is stored in a different format
 * and let a second, disconnected account be created for the same real phone
 * number. See vendorLookupService.ts's doc comment for the full reasoning.
 */

import { NextRequest, NextResponse } from "next/server";
import { VendorRegisterSchema } from "@/lib/validation/schemas";
import { createVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import { sanitizeAttribution } from "@/domain/attribution/attributionService";
import { backfillOpportunitiesForNewVendor } from "@/services/lead/leadService";
import { findVendorByPhone } from "@/domain/vendorAuth/vendorLookupService";
import prisma from "@/lib/db/prisma";
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

  const parseResult = VendorRegisterSchema.safeParse(body);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path.join(".");
      if (field && !fields[field]) fields[field] = issue.message;
    }
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please correct the highlighted fields.", fields } },
      { status: 422 }
    );
  }

  const { phone, name, city, services, attribution } = parseResult.data;
  const sanitizedAttribution = attribution
    ? sanitizeAttribution(attribution)
    : null;

  const existingVendor = await findVendorByPhone(phone);
  if (existingVendor) {
    return NextResponse.json(
      {
        error: {
          code: "PHONE_ALREADY_REGISTERED",
          message: "A vendor account already exists for this phone number.",
        },
      },
      { status: 409 }
    );
  }

  try {
    const serviceRows = await prisma.service.findMany({
      where: { slug: { in: services } },
    });

    const vendor = await prisma.vendor.create({
      data: {
        name,
        city,
        contactPhone: phone,
        verificationStatus: "PENDING",
        services: {
          create: serviceRows.map((s) => ({ serviceId: s.id, eventTypes: [] })),
        },
      },
    });

    if (sanitizedAttribution) {
      await prisma.vendorAttribution.create({
        data: {
          vendorId: vendor.id,
          utmSource: sanitizedAttribution.source ?? null,
          utmMedium: sanitizedAttribution.medium ?? null,
          utmCampaign: sanitizedAttribution.campaign ?? null,
          utmContent: sanitizedAttribution.content ?? null,
          utmTerm: sanitizedAttribution.term ?? null,
          landingPath: sanitizedAttribution.landingPath ?? null,
        },
      });
    }

    await createVendorSession(vendor.id);
    await createAuditLog({
      entityType: "Vendor",
      entityId: vendor.id,
      action: "VENDOR_REGISTERED",
    });

    // Stage 21 — one-time backfill: give this brand-new vendor a look at still-open
    // leads it would have matched had it existed when they were submitted. An
    // explicit, informed product decision (see session record), not a default a
    // vendor could trigger again later. Registration itself must succeed even if
    // this fails — it's a bonus side effect, not the primary contract of this
    // route — so it's isolated in its own try/catch and only logged on failure.
    try {
      const backfillResult = await backfillOpportunitiesForNewVendor({
        id: vendor.id,
        name: vendor.name,
        city: vendor.city,
        active: vendor.active,
        profileComplete: vendor.profileComplete,
        services: serviceRows.map((s) => ({ service: { slug: s.slug }, eventTypes: [] })),
      });
      logger.info("New-vendor backfill matching complete", {
        operation: "POST /api/vendor/register",
        vendorId: vendor.id,
        leadsEvaluated: backfillResult.leadsEvaluated,
        opportunitiesCreated: backfillResult.opportunitiesCreated,
      });
    } catch (backfillError) {
      logger.error("New-vendor backfill matching failed — registration still succeeded", {
        operation: "POST /api/vendor/register",
        vendorId: vendor.id,
        errorCode: "VENDOR_BACKFILL_FAILED",
      });
    }

    return NextResponse.json(
      { vendorId: vendor.id, verificationStatus: vendor.verificationStatus },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Failed to register vendor", {
      operation: "POST /api/vendor/register",
      errorCode: "VENDOR_REGISTER_FAILED",
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not complete registration. Please try again." } },
      { status: 500 }
    );
  }
}
