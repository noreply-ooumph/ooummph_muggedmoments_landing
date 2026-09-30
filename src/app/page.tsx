/**
 * MuggedMoments — Homepage route
 *
 * Thin server wrapper — carries the route's `metadata` export (a client
 * component cannot export `metadata` in the Next.js App Router) and renders
 * the actual page logic from HomeClient.tsx. Mirrors the same server/client
 * split already used by /status/[publicLeadId].
 */

import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { SITE_CONFIG } from "@/config/content";

export const metadata: Metadata = {
  title: SITE_CONFIG.seo.title,
  description: SITE_CONFIG.seo.description,
  openGraph: {
    title: SITE_CONFIG.seo.ogTitle,
    description: SITE_CONFIG.seo.ogDescription,
  },
};

export default function Home() {
  return <HomeClient />;
}
