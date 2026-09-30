/**
 * MuggedMoments — Page view tracker
 *
 * Fires the existing `page_view` analytics event (via analytics.page(), the
 * same method PersistedAnalyticsProvider already implements for exactly this
 * purpose) once per route change. Mounted once from the root layout so every
 * route — including new pages added alongside it — gets page_view coverage
 * automatically, with no per-page wiring required.
 *
 * A `useRef` guard prevents a duplicate fire from React StrictMode's
 * double-invoked effects in development.
 */

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics";

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    analytics.page(pathname);
  }, [pathname]);

  return null;
}
