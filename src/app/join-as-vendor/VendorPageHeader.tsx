/**
 * MuggedMoments — /join-as-vendor Header wrapper (client boundary)
 *
 * page.tsx is a server component, so this thin client wrapper is what it
 * imports directly — kept so page.tsx's import doesn't need to change.
 *
 * Previously rendered the shared customer-facing Header (from
 * @/components/landing/Header) with its onClick overridden to go to /vendor.
 * That header's nav anchors and "Check My Status" link were built for the
 * customer landing page and didn't apply here — see VendorHeader.tsx's header
 * comment for the full reasoning. Now renders the dedicated VendorHeader
 * instead; @/components/landing/Header itself is untouched and still used
 * correctly by the customer-facing pages.
 *
 * Also the attribution-capture point for this whole page — same role
 * HomeClient.tsx plays for "/". page.tsx (the server component this wraps)
 * cannot call a client hook itself, and this is the one component guaranteed
 * to render at the top of every /join-as-vendor view, so useAttribution()
 * lives here. Its useEffect writes utm_source/medium/campaign/content/term
 * into sessionStorage on first render; every CTA on this page is a plain
 * `href="/vendor"` link (never touched here), and /vendor's own
 * useAttribution() call reads that same sessionStorage key back on landing
 * (see attributionService.ts's mergeAttribution — stored values win), so the
 * capture survives the click-through without needing the query string
 * forwarded on the link itself. Previously nothing on this page called
 * useAttribution() at all, so a vendor campaign's UTM tags were silently
 * dropped before ever reaching /vendor's own capture.
 */

"use client";

import { useAttribution } from "@/hooks/useAttribution";
import { VendorHeader } from "./VendorHeader";

export function VendorPageHeader() {
  useAttribution();
  return <VendorHeader />;
}
