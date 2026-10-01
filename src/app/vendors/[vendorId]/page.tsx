/**
 * MuggedMoments — /vendors/[vendorId] (Stage 16, Phase 3; reworked in the public
 * trust/UX brief)
 *
 * Public, unauthenticated, read-only server component. No client-component split —
 * there is no interactivity here, just server-rendered facts.
 *
 * Queries Prisma directly (not via /api/vendors/[vendorId]) to avoid an unnecessary
 * server-to-self network hop; both this page and that route share the same
 * toPublicVendorProfile() mapping so their output never drifts apart.
 *
 * The "Start Planning" CTA below is deliberately NOT "Enquire with this vendor" —
 * matching in this app is strictly deterministic across all eligible vendors (see
 * domain/matching/matchingService.ts); there is no mechanism to guarantee a
 * connection with one specific vendor. The CTA pre-fills the real /plan-event form
 * with this vendor's services/city as a head start, and says exactly that, not more.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { toPublicVendorProfile } from "@/domain/vendorProfile/publicVendorProfileService";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { VendorAvatarPlaceholder } from "@/components/public/VendorAvatarPlaceholder";
import prisma from "@/lib/db/prisma";

const VERIFICATION_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: "Pending review", tone: "amber" },
  VERIFIED: { label: "Verified", tone: "emerald" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export default async function PublicVendorProfilePage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      services: { include: { service: true } },
      portfolioItems: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!vendor || !vendor.active) {
    notFound();
  }

  const profile = toPublicVendorProfile(vendor);
  const status = VERIFICATION_BADGE[profile.verificationStatus] ?? VERIFICATION_BADGE.PENDING;
  const heroImage = profile.portfolioItems[0]?.imagePath ?? null;

  const ctaParams = new URLSearchParams();
  if (profile.serviceSlugs.length > 0) {
    ctaParams.set("services", profile.serviceSlugs.join(","));
  }
  if (profile.city) {
    ctaParams.set("city", profile.city);
  }
  const ctaHref = `/plan-event${ctaParams.toString() ? `?${ctaParams.toString()}` : ""}`;

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <PublicSiteHeader />

      <main className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-md mx-auto bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 overflow-hidden">
          {/* Hero */}
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- local disk-served static path, not an optimizable remote image
            <img
              src={heroImage}
              alt="Portfolio"
              className="w-full aspect-video object-cover"
            />
          ) : (
            <VendorAvatarPlaceholder
              name={profile.name}
              className="w-full aspect-video text-4xl"
            />
          )}

          <div className="p-8">
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">{profile.name}</h1>
            <p className="text-sm text-zinc-400 mb-4">{profile.city}</p>
            <div className="mb-6">
              <StatusBadge label={status.label} tone={status.tone} />
            </div>

            <Link
              href={`/vendors/${profile.id}/book-meeting`}
              className="block w-full text-center rounded-xl bg-amber-400 text-zinc-950 font-bold py-3 mb-6 hover:bg-amber-300 shadow-md shadow-amber-400/10 transition-all text-base"
            >
              📅 Book a Meeting
            </Link>

            {profile.startingPrice !== null && (
              <div className="mb-4">
                <p className="text-sm text-zinc-400 mb-1">Starting from</p>
                <p className="text-base text-zinc-200 font-medium">₹{profile.startingPrice.toLocaleString("en-IN")}</p>
              </div>
            )}

            {profile.about && (
              <div className="mb-4">
                <p className="text-sm text-zinc-400 mb-1">About</p>
                <p className="text-sm text-zinc-300">{profile.about}</p>
              </div>
            )}

            {profile.serviceAreas.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-zinc-400 mb-2">Service areas</p>
                <div className="flex flex-wrap gap-2">
                  {profile.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="text-sm bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.services.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-zinc-400 mb-2">Services</p>
                <ul className="text-sm text-zinc-300 list-disc list-inside">
                  {profile.services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm text-zinc-400 mb-2">Portfolio</p>
              {profile.portfolioItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {profile.portfolioItems.map((item) => (
                    // eslint-disable-next-line @next/next/no-img-element -- local disk-served static path, not an optimizable remote image
                    <img
                      key={item.id}
                      src={item.imagePath}
                      alt="Portfolio"
                      className="w-full aspect-square object-cover rounded-md border border-zinc-700"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  This vendor hasn&apos;t added portfolio photos yet.
                </p>
              )}
            </div>

            {profile.documents.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-zinc-400 mb-2">Brochure</p>
                <ul className="space-y-2">
                  {profile.documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
                      >
                        📄 {doc.originalFilename || "View brochure"}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
