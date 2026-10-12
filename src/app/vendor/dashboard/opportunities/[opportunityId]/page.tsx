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
    redirect("/join-as-vendor");
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
    <div className="w-full space-y-6">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {formatEventTypeDisplay(currentOpportunity.lead.eventType.name, currentOpportunity.lead.customEventTypeName)}
              </h1>
              {!canRespond && !expired && (
                <StatusBadge
                  label={STATUS_LABEL[currentOpportunity.status]?.label ?? currentOpportunity.status}
                  tone={STATUS_LABEL[currentOpportunity.status]?.tone ?? "zinc"}
                />
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Client event request details & consultation options
            </p>
          </div>
          <Link
            href="/vendor/dashboard/opportunities"
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors border border-zinc-700/60 shrink-0"
          >
            ← Back to Opportunities
          </Link>
        </div>

        {/* Event Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Location</span>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span>📍</span> {currentOpportunity.lead.city}
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Event Date</span>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span>📅</span> {currentOpportunity.lead.eventDate ? currentOpportunity.lead.eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Flexible / TBD"}
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Guest Count</span>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span>👥</span> {currentOpportunity.lead.guestCount ? `${currentOpportunity.lead.guestCount} guests` : "Not specified"}
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Budget Range</span>
            <p className="text-sm font-bold text-amber-400 font-mono mt-1 flex items-center gap-1.5">
              <span>💰</span> {currentOpportunity.lead.budget ? (isNaN(Number(currentOpportunity.lead.budget)) ? currentOpportunity.lead.budget : `₹${Number(currentOpportunity.lead.budget).toLocaleString("en-IN")}`) : "Not specified"}
            </p>
          </div>
        </div>

        {/* Services Requested */}
        {currentOpportunity.lead.services.length > 0 && (
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Services Requested by Client ({currentOpportunity.lead.services.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentOpportunity.lead.services.map((svc) => (
                <span
                  key={svc}
                  className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-700/80 text-amber-300 font-semibold text-xs rounded-xl shadow-sm"
                >
                  ✓ {svc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status Banners & Actions */}
        {expired && !canRespond && currentOpportunity.status !== "INTERESTED" && currentOpportunity.status !== "DECLINED" && (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 font-medium flex items-center gap-2">
            <span>⏳</span> This opportunity has expired. No further actions can be taken.
          </div>
        )}

        {canRespond && (
          <div className="pt-2 border-t border-zinc-800">
            <OpportunityActions opportunityId={currentOpportunity.id} />
          </div>
        )}

        {QUOTE_LINK_LABEL[currentOpportunity.status] && (
          <div className="pt-2 border-t border-zinc-800">
            <Link
              href={`/vendor/dashboard/opportunities/${currentOpportunity.id}/quote`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-400/10"
            >
              <span>{QUOTE_LINK_LABEL[currentOpportunity.status]}</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {/* Portfolio / Brochure Tip Footer */}
        <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50">
          💡 Have a portfolio photo or PDF brochure ready?{" "}
          <Link href="/vendor/dashboard/edit" className="text-amber-400 font-semibold underline hover:text-amber-300">
            Add it to your profile once
          </Link>{" "}
          — it&apos;s shown automatically wherever clients view your quotes, no need to re-upload for every single lead.
        </div>
      </div>
    </div>
  );
}
