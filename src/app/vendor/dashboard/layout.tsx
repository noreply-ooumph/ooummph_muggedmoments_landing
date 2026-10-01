/**
 * MuggedMoments — /vendor/dashboard layout (Phase 1 of the vendor UX brief)
 *
 * Runs before every page under /vendor/dashboard/*. Does the session check + vendor
 * fetch ONCE here rather than duplicated in each page, then wraps the page in the
 * shared VendorDashboardShell (persistent header/nav — see that file).
 *
 * Each child page previously redirected to /vendor itself if there was no session;
 * this layout's redirect() runs first and makes those unreachable in practice, but
 * per the brief's "minimal diff" guardrail those per-page checks were left in place
 * rather than stripped out — they are inert, not broken.
 */

import { redirect } from "next/navigation";
import { getVendorSession } from "@/lib/vendorSession";
import prisma from "@/lib/db/prisma";
import { VendorDashboardShell } from "./VendorDashboardShell";

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    select: { name: true, city: true, verificationStatus: true },
  });

  if (!vendor) {
    redirect("/vendor");
  }

  const [opportunityCount, bookingRequestCount, meetingCount] = await Promise.all([
    prisma.vendorOpportunity.count({ where: { vendorId: session.vendorId } }),
    prisma.bookingRequest.count({ where: { opportunity: { vendorId: session.vendorId } } }),
    prisma.vendorMeeting.count({ where: { vendorId: session.vendorId, status: "SCHEDULED" } }),
  ]);

  return (
    <VendorDashboardShell
      vendor={vendor}
      counts={{
        opportunities: opportunityCount,
        bookingRequests: bookingRequestCount,
        meetings: meetingCount,
      }}
    >
      {children}
    </VendorDashboardShell>
  );
}
