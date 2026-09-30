/**
 * MuggedMoments — /admin/leads/[publicLeadId]
 *
 * Server component, calls getLeadTimeline() directly — same architecture
 * choice as /admin/leads itself (no client-side fetch for the timeline
 * itself). Resolves publicLeadId -> internal id the same way the existing
 * GET /api/internal/leads/[publicLeadId]/timeline route already does.
 *
 * The "Requirement Details" card below is the one interactive piece — it
 * needed a client boundary to support the edit form, so it's delegated to
 * AdminLeadDetailCard.tsx (see that file for the correction feature itself).
 *
 * Covered by proxy.ts's Basic Auth gate (/admin/:path*).
 */

import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getLeadTimeline } from "@/domain/analytics/funnelService";
import { getLeadDetailForAdmin } from "@/services/lead/leadService";
import { AdminLeadDetailCard } from "./AdminLeadDetailCard";

// Same reasoning as /admin/leads/page.tsx — forced dynamic so this always
// reflects the lead's current status/timeline rather than whatever it looked
// like the first time this exact URL was rendered.
export const dynamic = "force-dynamic";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ publicLeadId: string }>;
}) {
  const { publicLeadId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    select: { id: true },
  });

  if (!lead) {
    notFound();
  }

  const [timeline, detail] = await Promise.all([
    getLeadTimeline(lead.id),
    getLeadDetailForAdmin(publicLeadId),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-bold text-white mb-6 font-mono">
        {publicLeadId}
      </h1>

      {detail && <AdminLeadDetailCard initialDetail={detail} />}

      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800/60">
        {timeline.length === 0 ? (
          <p className="p-4 text-zinc-400 text-sm">No timeline entries yet.</p>
        ) : (
          timeline.map((entry, idx) => (
            <div key={idx} className="p-4 flex items-start gap-4 text-sm">
              <span className="text-zinc-500 whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span
                className={
                  entry.source === "audit" ? "text-amber-400" : "text-zinc-400"
                }
              >
                {entry.label}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
