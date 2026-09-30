/**
 * MuggedMoments — PATCH /api/vendor/profile (Stage 16, Phase 1)
 *
 * Session-gated. Updates only the fields present in the request body (partial patch).
 * profileComplete is derived server-side from the resulting row via
 * deriveProfileComplete() — never trusted from the client, never set independently.
 *
 * name/city/services (the VendorService join rows — WHAT the vendor offers,
 * distinct from serviceAreas, WHERE they offer it) were previously only
 * settable at registration (POST /api/vendor/register), with no edit path
 * afterward. That was a real gap: city and services are both hard matching
 * dimensions (see matchingService.ts's evaluateCompatibility()) — a vendor
 * who mistyped their city, or wants to add/drop a service they offer, had no
 * way to ever fix it. This route now accepts them too.
 *
 * Deliberately does NOT re-trigger backfillOpportunitiesForNewVendor() after a
 * city/services change, even though it would be technically reusable here —
 * that function's own doc comment in leadService.ts explicitly records it as
 * "not a default a vendor could trigger again later," a deliberate product
 * decision from when it was built for registration. Letting a profile edit
 * re-trigger it would directly contradict that recorded decision (and open a
 * trivial toggle-city-back-and-forth way to force repeated re-scans). So this
 * follows the same policy as every other edit-after-the-fact feature in this
 * codebase: the change applies going forward only, and does not retroactively
 * touch any existing LeadVendorMatch/VendorOpportunity row. The edit form
 * states this plainly.
 */

import { NextRequest, NextResponse } from "next/server";
import { VendorProfilePatchSchema } from "@/lib/validation/schemas";
import { deriveProfileComplete } from "@/domain/vendorProfile/vendorProfileService";
import { getVendorSession } from "@/lib/vendorSession";
import { createAuditLog } from "@/domain/audit/auditService";
import { toApiErrorResponse } from "@/lib/errors";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  const parseResult = VendorProfilePatchSchema.safeParse(body);
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

  const { name, city, services, about, startingPrice, serviceAreas } = parseResult.data;

  // Build the update payload with only the keys the caller actually sent —
  // Zod's .optional() means "undefined" for an omitted field, and Prisma already
  // skips undefined keys, but we're explicit here rather than relying on that
  // implicitly for a field-by-field partial patch.
  const patchData: {
    name?: string;
    city?: string;
    about?: string;
    startingPrice?: number;
    serviceAreas?: string[];
  } = {};
  if (name !== undefined) patchData.name = name;
  if (city !== undefined) patchData.city = city;
  if (about !== undefined) patchData.about = about;
  if (startingPrice !== undefined) patchData.startingPrice = startingPrice;
  if (serviceAreas !== undefined) patchData.serviceAreas = serviceAreas;

  try {
    const currentVendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      include: { services: { select: { service: { select: { slug: true } } } } },
    });
    if (!currentVendor) {
      return NextResponse.json(
        { error: { code: "VENDOR_NOT_FOUND", message: "Vendor not found." } },
        { status: 404 }
      );
    }

    // Compute the *resulting* row (current values merged with this patch) so
    // profileComplete can be derived and persisted in the same single update call,
    // rather than writing once and re-deriving/writing again. name/city/services
    // are deliberately NOT inputs to deriveProfileComplete() — they're required,
    // non-null fields set at registration, unlike about/startingPrice/serviceAreas
    // which start empty; nothing about editing them changes that checklist.
    const profileComplete = deriveProfileComplete({
      about: about !== undefined ? about : currentVendor.about,
      startingPrice: startingPrice !== undefined ? startingPrice : currentVendor.startingPrice,
      serviceAreas: serviceAreas !== undefined ? serviceAreas : currentVendor.serviceAreas,
    });

    // Reconcile VendorService rows to exactly match the requested slug set —
    // same slug->Service lookup pattern as POST /api/vendor/register. Only
    // touches rows that actually changed; a slug already present is left alone.
    let finalServiceSlugs = currentVendor.services.map((s) => s.service.slug);
    if (services !== undefined) {
      const currentSlugs = finalServiceSlugs;
      const toAdd = services.filter((s) => !currentSlugs.includes(s));
      const toRemove = currentSlugs.filter((s) => !services.includes(s));

      if (toRemove.length > 0) {
        const removeRows = await prisma.service.findMany({ where: { slug: { in: toRemove } } });
        await prisma.vendorService.deleteMany({
          where: { vendorId: session.vendorId, serviceId: { in: removeRows.map((r) => r.id) } },
        });
      }
      if (toAdd.length > 0) {
        const addRows = await prisma.service.findMany({ where: { slug: { in: toAdd } } });
        await prisma.vendorService.createMany({
          data: addRows.map((r) => ({ vendorId: session.vendorId, serviceId: r.id, eventTypes: [] })),
        });
      }
      finalServiceSlugs = services;
    }

    const finalVendor = await prisma.vendor.update({
      where: { id: session.vendorId },
      data: { ...patchData, profileComplete },
    });

    await createAuditLog({
      entityType: "Vendor",
      entityId: finalVendor.id,
      action: "VENDOR_PROFILE_UPDATED",
      metadata: { fields: Object.keys(patchData).concat(services !== undefined ? ["services"] : []) },
    });

    return NextResponse.json(
      {
        id: finalVendor.id,
        name: finalVendor.name,
        city: finalVendor.city,
        about: finalVendor.about,
        startingPrice: finalVendor.startingPrice,
        serviceAreas: finalVendor.serviceAreas,
        services: finalServiceSlugs,
        profileComplete: finalVendor.profileComplete,
        verificationStatus: finalVendor.verificationStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to update vendor profile", {
      operation: "PATCH /api/vendor/profile",
      errorCode: "VENDOR_PROFILE_UPDATE_FAILED",
    });
    const { body: errBody, status } = toApiErrorResponse(error);
    return NextResponse.json(errBody, { status });
  }
}
