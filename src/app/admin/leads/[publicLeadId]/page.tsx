import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { getLeadTimeline } from "@/domain/analytics/funnelService";
import { getLeadDetailForAdmin } from "@/services/lead/leadService";
import { AdminLeadDetailCard } from "./AdminLeadDetailCard";

export const dynamic = "force-dynamic";

function getMeetingStatusBadge(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "COMPLETED":
      return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "CANCELLED":
      return "bg-red-500/10 text-red-400 border-red-500/30";
    case "SCHEDULED":
    default:
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  }
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ publicLeadId: string }>;
}) {
  const { publicLeadId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    select: { id: true, phone: true },
  });

  if (!lead) {
    notFound();
  }

  const [timeline, detail, meetings, opportunities] = await Promise.all([
    getLeadTimeline(lead.id),
    getLeadDetailForAdmin(publicLeadId),
    prisma.vendorMeeting.findMany({
      where: { customerPhone: lead.phone },
      include: {
        vendor: { select: { id: true, name: true, city: true, contactPhone: true } },
      },
      orderBy: { meetingDate: "desc" },
    }),
    prisma.vendorOpportunity.findMany({
      where: { leadId: lead.id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            city: true,
            contactPhone: true,
            verificationStatus: true,
          },
        },
        quote: {
          select: {
            versions: {
              select: {
                lineItems: { select: { amount: true } },
              },
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs text-amber-400 font-mono uppercase tracking-wider block mb-1">Lead Reference</span>
          <h1 className="text-3xl font-bold text-white font-mono">{publicLeadId}</h1>
        </div>
      </div>

      {detail && <AdminLeadDetailCard initialDetail={detail} />}

      {/* Scheduled Customer Meetings with Vendors */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 my-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📅</span> Customer Consultation Meetings ({meetings.length})
        </h2>
        {meetings.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg text-sm">
            No consultation meetings scheduled by this customer yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Vendor Phone</th>
                  <th className="p-3">Meeting Date & Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Customer Notes</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/50">
                    <td className="p-3 font-semibold text-zinc-200">{m.vendor.name}</td>
                    <td className="p-3 text-zinc-400 font-mono text-xs">{m.vendor.contactPhone ?? "—"}</td>
                    <td className="p-3">
                      <div className="font-semibold text-amber-400">
                        {new Date(m.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="text-xs text-zinc-400">{m.timeSlot}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${getMeetingStatusBadge(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400 max-w-xs truncate">{m.notes ?? "—"}</td>
                    <td className="p-3">
                      <Link
                        href={`/admin/vendors/${m.vendor.id}`}
                        className="text-xs text-amber-400 hover:underline font-semibold"
                      >
                        View Vendor ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Matched Vendors & Response Status */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡</span> Matched Vendors & Response Status ({opportunities.length})
        </h2>
        {opportunities.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg text-sm">
            No matched vendors assigned to this lead opportunity.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Vendor Name</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Response Status</th>
                  <th className="p-3">Quoted Amount</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {opportunities.map((opp) => {
                  const lineItems = opp.quote?.versions[0]?.lineItems ?? [];
                  const quotePrice = lineItems.length > 0
                    ? lineItems.reduce((sum, item) => sum + item.amount, 0)
                    : null;
                  return (
                    <tr key={opp.id} className="hover:bg-zinc-900/50">
                      <td className="p-3 font-semibold text-zinc-200">{opp.vendor.name}</td>
                      <td className="p-3 text-zinc-400">{opp.vendor.city}</td>
                      <td className="p-3 text-zinc-400 font-mono text-xs">{opp.vendor.contactPhone ?? "—"}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {opp.status}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400 font-semibold">
                        {quotePrice != null ? `₹${quotePrice.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/admin/vendors/${opp.vendor.id}`}
                          className="text-xs text-amber-400 hover:underline font-semibold"
                        >
                          View Vendor ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Timeline */}
      <h2 className="text-lg font-bold text-white mb-3">Audit Timeline</h2>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/60">
        {timeline.length === 0 ? (
          <p className="p-4 text-zinc-400 text-sm">No timeline entries yet.</p>
        ) : (
          timeline.map((entry, idx) => (
            <div key={idx} className="p-4 flex items-start gap-4 text-sm">
              <span className="text-zinc-500 whitespace-nowrap font-mono text-xs">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span
                className={
                  entry.source === "audit" ? "text-amber-400 font-semibold" : "text-zinc-400"
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

