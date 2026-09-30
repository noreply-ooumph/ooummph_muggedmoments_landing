/**
 * MuggedMoments — Admin Vendor Service (Admin panel MVP)
 *
 * Kept as a separate file from vendorProfileService.ts on purpose: that file
 * is explicitly documented as "Deterministic, pure. No AI, no I/O" — these
 * functions do Prisma I/O, so they don't belong there.
 *
 * v1 scope: list vendors, flip verificationStatus, and fire a status
 * notification (added after the initial v1 build). Still no rejection
 * reason, no pagination (see the implementation briefs for the reasoning).
 */

import { unlink } from "fs/promises";
import path from "path";
import prisma from "@/lib/db/prisma";
import { createAuditLog } from "@/domain/audit/auditService";
import { whatsApp } from "@/lib/whatsapp";
import { deriveProfileComplete } from "@/domain/vendorProfile/vendorProfileService";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import type { Vendor, VendorVerificationStatus } from "@prisma/client";

export async function listVendorsForAdmin(): Promise<
  Pick<
    Vendor,
    "id" | "name" | "city" | "contactPhone" | "verificationStatus" | "createdAt"
  >[]
> {
  return prisma.vendor.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      contactPhone: true,
      verificationStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export interface VendorTimelineEntry {
  timestamp: string;
  label: string;
  metadata?: unknown;
}

/**
 * Admin panel MVP — a vendor's audit history. Mirrors getLeadTimeline()'s
 * exact query/mapping shape in funnelService.ts (audit rows only — vendors
 * have no AnalyticsEvent relation the way leads do, so there's no second
 * source to merge here).
 */
export async function getVendorTimeline(
  vendorId: string
): Promise<VendorTimelineEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entityType: "Vendor", entityId: vendorId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    timestamp: row.createdAt.toISOString(),
    label: row.action,
    metadata: row.metadata,
  }));
}

export async function setVendorVerificationStatus(
  vendorId: string,
  status: Extract<VendorVerificationStatus, "VERIFIED" | "REJECTED">
): Promise<Vendor> {
  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: { verificationStatus: status },
  });

  await createAuditLog({
    entityType: "Vendor",
    entityId: vendor.id,
    action:
      status === "VERIFIED"
        ? "VENDOR_VERIFICATION_APPROVED"
        : "VENDOR_VERIFICATION_REJECTED",
    actorType: "USER",
  });

  // Notification — deliberately NOT wrapped in runAutomation(), unlike booking
  // accept/reject: runAutomation()'s idempotency key is leadId:type:version
  // and AutomationExecution.leadId is a required FK to Lead. There is no lead
  // involved in a vendor verification decision, so that wrapper doesn't apply
  // here architecturally — this calls the same underlying whatsApp provider
  // directly instead. Under the current Unconfigured provider this will not
  // deliver anything (matches every other notification path in this
  // codebase) — it fires and fails honestly, which is the correct behavior.
  if (vendor.contactPhone) {
    await whatsApp.sendMessage({
      to: vendor.contactPhone,
      body:
        status === "VERIFIED"
          ? "Your MuggedMoments profile has been approved."
          : "Your MuggedMoments profile was not approved at this time.",
    });
  }

  return vendor;
}

export interface AdminVendorDetail {
  id: string;
  name: string;
  city: string;
  about: string | null;
  startingPrice: number | null;
  serviceAreas: string[];
  services: string[];
  profileComplete: boolean;
  verificationStatus: VendorVerificationStatus;
}

/**
 * Admin-side correction of a vendor's own editable profile fields — same
 * fields, same reconciliation logic as the vendor's own PATCH /api/vendor/profile
 * (VendorProfilePatchSchema is reused as-is, not duplicated: the field set and
 * validation rules are identical, there's no admin-specific difference the way
 * updateLeadDetailsForAdmin() has for eventDate). Kept as its own function
 * (not a call into the vendor route) because that route is session-gated to
 * "the logged-in vendor may only edit themselves" — an admin correction is a
 * different trust boundary and belongs in this admin-only service file, same
 * split already established for setVendorVerificationStatus() above.
 *
 * Deliberately does NOT re-trigger backfillOpportunitiesForNewVendor() after a
 * city/services change — identical reasoning to the vendor's own PATCH route's
 * documented decision (see that route's header comment): the change applies
 * going forward only, never retroactively touches an existing LeadVendorMatch/
 * VendorOpportunity row.
 */
export async function updateVendorDetailsForAdmin(
  vendorId: string,
  patch: {
    name?: string;
    city?: string;
    services?: string[];
    about?: string;
    startingPrice?: number;
    serviceAreas?: string[];
  }
): Promise<AdminVendorDetail> {
  const currentVendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { services: { select: { service: { select: { slug: true } } } } },
  });
  if (!currentVendor) {
    throw new AppError("VENDOR_NOT_FOUND", "Vendor not found.", undefined, 404);
  }

  const patchData: {
    name?: string;
    city?: string;
    about?: string;
    startingPrice?: number;
    serviceAreas?: string[];
  } = {};
  if (patch.name !== undefined) patchData.name = patch.name;
  if (patch.city !== undefined) patchData.city = patch.city;
  if (patch.about !== undefined) patchData.about = patch.about;
  if (patch.startingPrice !== undefined) patchData.startingPrice = patch.startingPrice;
  if (patch.serviceAreas !== undefined) patchData.serviceAreas = patch.serviceAreas;

  const profileComplete = deriveProfileComplete({
    about: patch.about !== undefined ? patch.about : currentVendor.about,
    startingPrice:
      patch.startingPrice !== undefined ? patch.startingPrice : currentVendor.startingPrice,
    serviceAreas:
      patch.serviceAreas !== undefined ? patch.serviceAreas : currentVendor.serviceAreas,
  });

  let finalServiceSlugs = currentVendor.services.map((s) => s.service.slug);
  if (patch.services !== undefined) {
    const currentSlugs = finalServiceSlugs;
    const toAdd = patch.services.filter((s) => !currentSlugs.includes(s));
    const toRemove = currentSlugs.filter((s) => !patch.services!.includes(s));

    if (toRemove.length > 0) {
      const removeRows = await prisma.service.findMany({ where: { slug: { in: toRemove } } });
      await prisma.vendorService.deleteMany({
        where: { vendorId, serviceId: { in: removeRows.map((r) => r.id) } },
      });
    }
    if (toAdd.length > 0) {
      const addRows = await prisma.service.findMany({ where: { slug: { in: toAdd } } });
      await prisma.vendorService.createMany({
        data: addRows.map((r) => ({ vendorId, serviceId: r.id, eventTypes: [] })),
      });
    }
    finalServiceSlugs = patch.services;
  }

  const finalVendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: { ...patchData, profileComplete },
  });

  await createAuditLog({
    entityType: "Vendor",
    entityId: finalVendor.id,
    action: "VENDOR_PROFILE_UPDATED",
    actorType: "USER",
    metadata: {
      fields: Object.keys(patchData).concat(patch.services !== undefined ? ["services"] : []),
      source: "ADMIN_CORRECTION",
    },
  });

  return {
    id: finalVendor.id,
    name: finalVendor.name,
    city: finalVendor.city,
    about: finalVendor.about,
    startingPrice: finalVendor.startingPrice,
    serviceAreas: finalVendor.serviceAreas,
    services: finalServiceSlugs,
    profileComplete: finalVendor.profileComplete,
    verificationStatus: finalVendor.verificationStatus,
  };
}

/**
 * Permanently deletes a vendor and everything that references it. Irreversible.
 *
 * Two relations are NOT covered by Prisma's onDelete: Cascade on the Vendor
 * side and must be cleared manually first, or the delete throws a foreign key
 * violation (confirmed empirically this session deleting a test vendor):
 *   - LeadVendorMatch.vendor has no cascade (Lead's own cascade only clears
 *     matches when the LEAD is deleted, not when the vendor is).
 *   - Booking.vendor has no cascade, AND Booking.bookingRequest also has no
 *     cascade — so a Booking row would otherwise block VendorOpportunity's own
 *     cascade into BookingRequest.
 * Once both are cleared, deleting the Vendor row cascades everything else:
 * VendorAttribution, VendorPortfolioItem, VendorDocument, VendorSession,
 * VendorService, VendorAvailability, and VendorOpportunity (which itself
 * cascades into Quote -> QuoteVersion -> QuoteLineItem/QuoteMessage, and into
 * BookingRequest -> BookingStatusHistory, now that no Booking blocks it).
 *
 * Portfolio/document files on disk are removed on a best-effort basis
 * (same non-fatal try/catch pattern as the individual DELETE routes for those
 * uploads) — the DB deletion is not blocked by a filesystem failure.
 */
export async function deleteVendorForAdmin(vendorId: string): Promise<{ name: string }> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { portfolioItems: true, documents: true },
  });
  if (!vendor) {
    throw new AppError("VENDOR_NOT_FOUND", "Vendor not found.", undefined, 404);
  }

  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { vendorId } }),
    prisma.leadVendorMatch.deleteMany({ where: { vendorId } }),
    prisma.vendor.delete({ where: { id: vendorId } }),
  ]);

  for (const item of vendor.portfolioItems) {
    try {
      await unlink(path.join(process.cwd(), "public", item.imagePath.replace(/^\//, "")));
    } catch {
      logger.warn("Failed to delete portfolio file during vendor deletion", {
        operation: "deleteVendorForAdmin",
        errorCode: "PORTFOLIO_FILE_DELETE_FAILED",
      });
    }
  }
  for (const doc of vendor.documents) {
    try {
      await unlink(path.join(process.cwd(), "public", doc.filePath.replace(/^\//, "")));
    } catch {
      logger.warn("Failed to delete document file during vendor deletion", {
        operation: "deleteVendorForAdmin",
        errorCode: "DOCUMENT_FILE_DELETE_FAILED",
      });
    }
  }

  await createAuditLog({
    entityType: "Vendor",
    entityId: vendorId,
    action: "VENDOR_DELETED",
    actorType: "USER",
    metadata: { name: vendor.name },
  });

  return { name: vendor.name };
}
