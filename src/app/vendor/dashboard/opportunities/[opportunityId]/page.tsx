/**
 * MuggedMoments — /vendor/dashboard/opportunities/[opportunityId] (Stage 18, Phase 18.0)
 *
 * Session-gated + ownership-checked (404 via notFound(), not a redirect, since the
 * vendor IS logged in — it's just not their opportunity). Marks SENT -> VIEWED
 * directly via Prisma (same principle as the public vendor profile page in Phase 3:
 * a server component queries Prisma directly rather than fetching its own API route).
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatEventTypeDisplay } from "@/config/event-types";
import { getVendorSession } from "@/lib/vendorSession";
import { nextStatus, isExpired } from "@/domain/opportunity/opportunityService";
import { createAuditLog } from "@/domain/audit/auditService";
import prisma from "@/lib/db/prisma";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { OpportunityActions } from "./OpportunityActions";

// SENT/VIEWED/INTERESTED/DECLINED tones match OpportunityListClient.tsx exactly.
// QUOTE_PENDING/QUOTE_SUBMITTED have no existing badge precedent anywhere in this
// codebase (the list page's STATUS_LABEL never had these 2 keys) — new tone choices
// made here: QUOTE_PENDING -> amber ("in progress", same tone as SENT/"New"),
// QUOTE_SUBMITTED -> emerald ("done", same tone as INTERESTED). Flagged per the brief
// since this is a new call, not a copy of an existing mapping.
const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  SENT: { label: "New", tone: "amber" },
  VIEWED: { label: "Viewed", tone: "zinc" },
  INTERESTED: { label: "You're interested", tone: "emerald" },
  DECLINED: { label: "You declined", tone: "red" },
  QUOTE_PENDING: { label: "Quote in progress", tone: "amber" },
  QUOTE_SUBMITTED: { label: "Quote submitted", tone: "emerald" },
};

const QUOTE_LINK_LABEL: Record<string, string> = {
  INTERESTED: "Build a Quote",
  QUOTE_PENDING: "Continue Quote",
  QUOTE_SUBMITTED: "View Submitted Quote",
};

export default async function VendorOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
  }

  const { opportunityId } = await params;

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      lead: {
        include: { eventType: { select: { name: true } } },
      },
    },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    notFound();
  }

  let currentOpportunity = opportunity;

  if (opportunity.status === "SENT") {
    const viewedStatus = nextStatus("SENT", "VIEW");
    if (viewedStatus) {
      currentOpportunity = await prisma.vendorOpportunity.update({
        where: { id: opportunity.id },
        data: { status: viewedStatus, viewedAt: new Date() },
        include: {
          lead: {
            include: { eventType: { select: { name: true } } },
          },
        },
      });

      await createAuditLog({
        entityType: "VendorOpportunity",
        entityId: opportunity.id,
        action: "VENDOR_OPPORTUNITY_VIEWED",
      });
    }
  }

  const now = new Date();
  const expired = isExpired(currentOpportunity, now);
  const canRespond = currentOpportunity.status === "VIEWED" && !expired;

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">New Event Request</h1>
        <Link href="/vendor/dashboard/opportunities" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          Back
        </Link>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-lg font-medium text-zinc-100">
          {formatEventTypeDisplay(currentOpportunity.lead.eventType.name, currentOpportunity.lead.customEventTypeName)}
        </p>
        <p className="text-sm text-zinc-400">📍 {currentOpportunity.lead.city}</p>
        {currentOpportunity.lead.eventDate && (
          <p className="text-sm text-zinc-400">
            📅 {currentOpportunity.lead.eventDate.toLocaleDateString()}
          </p>
        )}
        {currentOpportunity.lead.guestCount && (
          <p className="text-sm text-zinc-400">👥 {currentOpportunity.lead.guestCount} guests</p>
        )}
        {currentOpportunity.lead.services.length > 0 && (
          <div>
            <p className="text-sm text-zinc-400 mb-1">Services requested:</p>
            <ul className="text-sm text-zinc-300 list-disc list-inside">
              {currentOpportunity.lead.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {currentOpportunity.lead.budget && (
          <p className="text-sm text-zinc-400">Budget: {currentOpportunity.lead.budget}</p>
        )}
      </div>

      {expired && !canRespond && currentOpportunity.status !== "INTERESTED" && currentOpportunity.status !== "DECLINED" && (
        <p className="text-sm text-zinc-500">This opportunity has expired.</p>
      )}

      {canRespond && <OpportunityActions opportunityId={currentOpportunity.id} />}

      {!canRespond && !expired && (
        <div className="mb-3">
          <StatusBadge
            label={STATUS_LABEL[currentOpportunity.status]?.label ?? currentOpportunity.status}
            tone={STATUS_LABEL[currentOpportunity.status]?.tone ?? "zinc"}
          />
        </div>
      )}

      {QUOTE_LINK_LABEL[currentOpportunity.status] && (
        <Link
          href={`/vendor/dashboard/opportunities/${currentOpportunity.id}/quote`}
          className="inline-block text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          {QUOTE_LINK_LABEL[currentOpportunity.status]}
        </Link>
      )}

      <p className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
        Have a portfolio or brochure ready?{" "}
        <Link href="/vendor/dashboard/edit" className="underline hover:text-zinc-300">
          Add it to your profile once
        </Link>{" "}
        — it&apos;s shown automatically wherever customers see your quotes, no need to
        re-upload it here.
      </p>
    </div>
  );
}
