/**
 * MuggedMoments — /robots.txt
 *
 * Next.js App Router convention (MetadataRoute.Robots) — no separate route
 * file needed, Next generates the txt from this export automatically.
 *
 * Disallows: /admin (Basic-Auth-gated already, but keep crawlers out of the
 * login prompt too), /api (never meant to be indexed), /vendor (auth/
 * registration flow), /privacy and /terms (already `noindex` via their own
 * page metadata — listed here too for defense in depth, not a contradiction).
 */

import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/vendor", "/privacy", "/terms"],
    },
    sitemap: `${SITE_CONFIG.siteUrl}/sitemap.xml`,
  };
}
