/**
 * MuggedMoments — /sitemap.xml
 *
 * Next.js App Router convention (MetadataRoute.Sitemap) — no separate route
 * file needed, Next generates the XML from this export automatically.
 *
 * Static entries are only the pages meant to be publicly indexed. Deliberately
 * excluded: /privacy and /terms (both explicitly set `robots: {index: false}`
 * pending legal review — including them here would contradict that), /vendor
 * (an auth/registration flow, not indexable content), /thank-you and
 * /status/[publicLeadId] (personalized post-submission state, not canonical
 * content), and everything under /admin and /api (already excluded by
 * robots.ts's disallow rules regardless).
 *
 * Vendor profile URLs are generated from the live database using the exact
 * same query /vendors (the public directory) already uses — active,
 * VERIFIED vendors only — so this never lists a pending/rejected vendor or
 * invents a URL that doesn't correspond to a real, live profile.
 */

import type { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";
import { SITE_CONFIG } from "@/config/content";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/plan-event", changeFrequency: "weekly", priority: 0.9 },
  { path: "/vendors", changeFrequency: "daily", priority: 0.8 },
  { path: "/join-as-vendor", changeFrequency: "monthly", priority: 0.7 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/corporate-events", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-caterer", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-decorator", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-dj", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-florist", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-makeup-artist", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-photographer", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-venue", changeFrequency: "monthly", priority: 0.6 },
  { path: "/find-videographer", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.siteUrl;

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const vendors = await prisma.vendor.findMany({
    where: { active: true, verificationStatus: "VERIFIED" },
    select: { id: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  const vendorEntries: MetadataRoute.Sitemap = vendors.map((vendor) => ({
    url: `${baseUrl}/vendors/${vendor.id}`,
    lastModified: vendor.updatedAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticEntries, ...vendorEntries];
}
