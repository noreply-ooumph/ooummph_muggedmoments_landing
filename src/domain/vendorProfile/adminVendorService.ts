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

import prisma from "@/lib/db/prisma";
import { createAuditLog } from "@/domain/audit/auditService";
import { whatsApp } from "@/lib/whatsapp";
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
