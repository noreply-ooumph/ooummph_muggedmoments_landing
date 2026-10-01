/**
 * MuggedMoments — /vendors (public directory)
 *
 * Public, unauthenticated, read-only server component — same architecture as
 * /vendors/[vendorId] (direct Prisma query, no API hop, shares the same
 * toPublicVendorProfile() mapper so output never drifts from the single-vendor
 * page).
 *
 * Deliberately different rule from /vendors/[vendorId]: only VERIFIED vendors
 * appear here. The single-vendor page honestly shows PENDING/REJECTED status
 * too (a direct-link page has different rules than an actively-promoted
 * public listing) — a rejected or unreviewed vendor must never appear in a
 * browsable directory. See publicVendorProfileService.ts's own documented
 * rules for why verificationStatus is never hidden or reinterpreted, only
 * filtered on here at the query level.
 *
 * Dev-seed vendors are not specially excluded or labeled here — they already
 * self-label via the literal "[DEVELOPMENT SEED] ..." prefix baked into their
 * name field, consistent with how every other admin/public view in this app
 * already handles them (no separate mechanism exists to mirror).
 */

import Link from "next/link";
import { toPublicVendorProfile } from "@/domain/vendorProfile/publicVendorProfileService";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { VendorAvatarPlaceholder } from "@/components/public/VendorAvatarPlaceholder";
import prisma from "@/lib/db/prisma";

// No fetch() calls and no Request-time API usage here — only a direct Prisma
// read. Left at the default `dynamic = "auto"`, Next.js would prerender this
// as a static build-time snapshot and freeze the vendor list at whatever it
// was when the app was last built (verified live: this exact bug on
// /admin/leads, same root cause). This page is the public "Explore Vendors"
// directory — every newly verified vendor must appear here without a
// redeploy, so it's forced dynamic.
export const dynamic = "force-dynamic";

export default async function VendorDirectoryPage() {
  const vendors = await prisma.vendor.findMany({
    where: { active: true },
    include: {
      services: { include: { service: true } },
      portfolioItems: { orderBy: { createdAt: "asc" }, take: 1 },
      // Not rendered on this card-grid view (only used further down the funnel on
      // the single-vendor page) — included here only because toPublicVendorProfile()
      // requires it on the raw row shape shared by both pages.
      documents: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const profiles = vendors.map(toPublicVendorProfile);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col font-sans">
      <PublicSiteHeader />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-10">
          Explore Vendors
        </h1>

        {profiles.length === 0 ? (
          <p className="text-zinc-400">No verified vendors yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="block p-5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:border-amber-500/40 rounded-xl transition-all duration-200 hover:-translate-y-1 shadow-xl"
              >
                {vendor.portfolioItems[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local disk-served static path, not an optimizable remote image
                  <img
                    src={vendor.portfolioItems[0].imagePath}
                    alt="Portfolio"
                    className="w-full aspect-video object-cover rounded-lg border border-zinc-800 mb-4"
                  />
                ) : (
                  <VendorAvatarPlaceholder
                    name={vendor.name}
                    className="w-full aspect-video rounded-lg mb-4 text-2xl"
                  />
                )}
                <h2 className="text-base font-semibold text-white">{vendor.name}</h2>
                <p className="text-sm text-zinc-400 mb-2">{vendor.city}</p>
                {vendor.startingPrice !== null && (
                  <p className="text-sm text-zinc-300 mb-1">
                    Starting from ₹{vendor.startingPrice.toLocaleString("en-IN")}
                  </p>
                )}
                {vendor.services.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    {vendor.services.length} service{vendor.services.length === 1 ? "" : "s"} —{" "}
                    {vendor.services.join(", ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
