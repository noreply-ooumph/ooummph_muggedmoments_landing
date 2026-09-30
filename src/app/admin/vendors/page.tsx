/**
 * MuggedMoments — /admin/vendors
 *
 * Thin server wrapper — same server-wrapper-plus-client-leaf split already
 * established by /plan-event and /join-as-vendor. Interactive Approve/Reject
 * buttons require client state, so unlike /admin/leads this page does need a
 * client component (see AdminVendorsClient.tsx).
 *
 * Covered by middleware.ts's Basic Auth gate (/admin/:path*).
 */

import type { Metadata } from "next";
import { AdminVendorsClient } from "./AdminVendorsClient";

export const metadata: Metadata = {
  title: "Admin — Vendors",
};

export default function AdminVendorsPage() {
  return <AdminVendorsClient />;
}
