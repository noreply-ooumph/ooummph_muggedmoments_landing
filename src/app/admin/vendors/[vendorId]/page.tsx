import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { getVendorTimeline } from "@/domain/vendorProfile/adminVendorService";
import { AdminVendorDetailActions } from "./AdminVendorDetailActions";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

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

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      city: true,
      contactPhone: true,
      verificationStatus: true,
      about: true,
      startingPrice: true,
      serviceAreas: true,
      createdAt: true,
      services: { select: { service: { select: { slug: true } } } },
      portfolioItems: {
        select: { id: true, imagePath: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        select: {
          id: true,
          filePath: true,
          originalFilename: true,
          fileSizeBytes: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      meetings: {
        select: {
          id: true,
          publicId: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          meetingDate: true,
          timeSlot: true,
          notes: true,
          status: true,
          createdAt: true,
        },
        orderBy: { meetingDate: "desc" },
      },
      opportunities: {
        select: {
          id: true,
          status: true,
          responseDeadline: true,
          createdAt: true,
          lead: {
            select: {
              publicLeadId: true,
              customerName: true,
              phone: true,
              city: true,
              eventType: { select: { name: true } },
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
      },
    },
  });

  if (!vendor) {
    notFound();
  }

  const timeline = await getVendorTimeline(vendor.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{vendor.name}</h1>
          <p className="text-zinc-400 text-sm">{vendor.city} · Registered {new Date(vendor.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${vendor.verificationStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
            {vendor.verificationStatus}
          </span>
        </div>
      </div>

      <AdminVendorDetailActions
        initialDetail={{
          id: vendor.id,
          name: vendor.name,
          city: vendor.city,
          about: vendor.about,
          startingPrice: vendor.startingPrice,
          serviceAreas: vendor.serviceAreas,
          services: vendor.services.map((s) => s.service.slug),
        }}
      />

      {/* Overview Info Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 mb-8 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-medium mb-1">Contact Phone</span>
          <span className="text-zinc-200 text-base font-semibold">{vendor.contactPhone ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-medium mb-1">Starting Price</span>
          <span className="text-amber-400 text-base font-semibold">{vendor.startingPrice != null ? `₹${vendor.startingPrice.toLocaleString()}` : "—"}</span>
        </div>
        <div className="md:col-span-2">
          <span className="text-zinc-500 block text-xs uppercase font-medium mb-1">About</span>
          <p className="text-zinc-300 leading-relaxed">{vendor.about ?? "—"}</p>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-medium mb-1">Services Offered</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {vendor.services.length > 0 ? (
              vendor.services.map((s) => (
                <span key={s.service.slug} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">
                  {s.service.slug}
                </span>
              ))
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-medium mb-1">Service Areas</span>
          <span className="text-zinc-300">{vendor.serviceAreas.length > 0 ? vendor.serviceAreas.join(", ") : "—"}</span>
        </div>
      </div>

      {/* Section Grid: Portfolio & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Portfolio Media Gallery */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📷</span> Portfolio Photos ({vendor.portfolioItems.length})
            </h2>
          </div>
          {vendor.portfolioItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg text-sm">
              No portfolio photos uploaded by vendor yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vendor.portfolioItems.map((item) => (
                <a
                  key={item.id}
                  href={item.imagePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 hover:border-amber-500/50 transition-all"
                >
                  <img
                    src={item.imagePath}
                    alt="Vendor portfolio work"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[10px] text-zinc-300 font-mono">View Full-Size ↗</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Documents / Brochures */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📄</span> Documents & Brochures ({vendor.documents.length})
            </h2>
          </div>
          {vendor.documents.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg text-sm">
              No PDF brochures or documents uploaded.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {vendor.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-sm hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-zinc-200 truncate">{doc.originalFilename}</p>
                      <p className="text-xs text-zinc-500">
                        {formatBytes(doc.fileSizeBytes)} · Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-semibold shrink-0 transition-colors"
                  >
                    View Document ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Customer Meetings Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📅</span> Scheduled Consultations & Meetings ({vendor.meetings.length})
        </h2>
        {vendor.meetings.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg text-sm">
            No customer meetings scheduled with this vendor yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {vendor.meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/50">
                    <td className="p-3 font-semibold text-zinc-200">{m.customerName}</td>
                    <td className="p-3 text-zinc-400 font-mono text-xs">
                      <div>{m.customerPhone}</div>
                      {m.customerEmail && <div className="text-zinc-500">{m.customerEmail}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-amber-400">{new Date(m.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      <div className="text-xs text-zinc-400">{m.timeSlot}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${getMeetingStatusBadge(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400 max-w-xs truncate">{m.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Matched Opportunities & Quotes */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡</span> Lead Opportunities & Quotes ({vendor.opportunities.length})
        </h2>
        {vendor.opportunities.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg text-sm">
            No active lead opportunities routed to this vendor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Lead ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Opportunity Status</th>
                  <th className="p-3">Quoted Price</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {vendor.opportunities.map((opp) => {
                  const lineItems = opp.quote?.versions[0]?.lineItems ?? [];
                  const latestQuotePrice = lineItems.length > 0
                    ? lineItems.reduce((sum, item) => sum + item.amount, 0)
                    : null;
                  return (
                    <tr key={opp.id} className="hover:bg-zinc-900/50">
                      <td className="p-3 font-mono text-xs text-amber-400 font-semibold">{opp.lead.publicLeadId}</td>
                      <td className="p-3 font-medium text-zinc-200">
                        <div>{opp.lead.customerName}</div>
                        <div className="text-xs text-zinc-500 font-mono">{opp.lead.phone}</div>
                      </td>
                      <td className="p-3 text-zinc-300">{opp.lead.eventType.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {opp.status}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400 font-semibold">
                        {latestQuotePrice != null ? `₹${latestQuotePrice.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/admin/leads/${opp.lead.publicLeadId}`}
                          className="text-xs text-amber-400 hover:underline font-semibold"
                        >
                          View Lead ↗
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

      {/* Timeline Section */}
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
              <span className="text-amber-400 font-semibold">{entry.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

