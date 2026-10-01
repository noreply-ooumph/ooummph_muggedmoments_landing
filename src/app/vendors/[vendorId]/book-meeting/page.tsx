/**
 * MuggedMoments — /vendors/[vendorId]/book-meeting
 *
 * Dedicated meeting booking page for host customers to select date and time
 * slots to schedule a consultation with a verified vendor.
 */

import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { BookMeetingClient } from "./BookMeetingClient";

export default async function BookMeetingPage({
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
      active: true,
      verificationStatus: true,
      services: {
        select: { service: { select: { name: true } } },
      },
    },
  });

  if (!vendor || !vendor.active) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <PublicSiteHeader />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <BookMeetingClient
          vendor={{
            id: vendor.id,
            name: vendor.name,
            city: vendor.city,
            services: vendor.services.map((s) => s.service.name),
          }}
        />
      </main>
    </div>
  );
}
