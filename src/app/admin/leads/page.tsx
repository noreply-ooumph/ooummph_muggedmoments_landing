/**
 * MuggedMoments — /admin/leads
 *
 * Admin lead operations dashboard.
 * Server component fetching listLeadsForAdmin() directly, rendering the interactive
 * AdminLeadsTable with real-time search, status filtering, pagination, and horizontal scroll.
 *
 * Covered by middleware.ts's Basic Auth gate (/admin/:path*).
 */

import Link from "next/link";
import { listLeadsForAdmin } from "@/services/lead/leadService";
import { AdminLeadsTable } from "./AdminLeadsTable";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await listLeadsForAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time deterministic event matching and customer leads database
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/admin/vendors"
            className="text-zinc-400 hover:text-amber-400 transition-colors underline"
          >
            Vendors
          </Link>
          <Link
            href="/admin/reports"
            className="text-zinc-400 hover:text-amber-400 transition-colors underline"
          >
            Reports
          </Link>
        </div>
      </div>

      <AdminLeadsTable initialLeads={leads} />
    </div>
  );
}
