/**
 * MuggedMoments — /admin/vendors/[vendorId]
 *
 * Server component, calls Prisma + getVendorTimeline() directly — same
 * architecture choice as /admin/leads/[publicLeadId]. The one interactive
 * piece (edit form + delete) is delegated to AdminVendorDetailActions.tsx,
 * same split as AdminLeadDetailCard.tsx on the lead detail page.
 *
 * Covered by proxy.ts's Basic Auth gate (/admin/:path*).
 */

import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getVendorTimeline } from "@/domain/vendorProfile/adminVendorService";
import { AdminVendorDetailActions } from "./AdminVendorDetailActions";

// Same reasoning as /admin/leads/page.tsx — forced dynamic so this always
// reflects the vendor's current status/timeline rather than whatever it
// looked like the first time this exact URL was rendered.
export const dynamic = "force-dynamic";

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
    },
  });

  if (!vendor) {
    notFound();
  }

  const timeline = await getVendorTimeline(vendor.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-bold text-white mb-1">{vendor.name}</h1>
      <p className="text-zinc-400 text-sm mb-6">{vendor.city}</p>

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

      <div className="rounded-xl border border-zinc-800 p-4 mb-8 text-sm flex flex-col gap-2">
        <div>
          <span className="text-zinc-500">Status: </span>
          <span>{vendor.verificationStatus}</span>
        </div>
        <div>
          <span className="text-zinc-500">Phone: </span>
          <span>{vendor.contactPhone ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-500">About: </span>
          <span>{vendor.about ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-500">Starting price: </span>
          <span>{vendor.startingPrice != null ? `₹${vendor.startingPrice}` : "—"}</span>
        </div>
        <div>
          <span className="text-zinc-500">Service areas: </span>
          <span>
            {vendor.serviceAreas.length > 0 ? vendor.serviceAreas.join(", ") : "—"}
          </span>
        </div>
      </div>

      <h2 className="text-lg font-bold text-white mb-3">Timeline</h2>
      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800/60">
        {timeline.length === 0 ? (
          <p className="p-4 text-zinc-400 text-sm">No timeline entries yet.</p>
        ) : (
          timeline.map((entry, idx) => (
            <div key={idx} className="p-4 flex items-start gap-4 text-sm">
              <span className="text-zinc-500 whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span className="text-amber-400">{entry.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
