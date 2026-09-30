/**
 * MuggedMoments — /admin/leads
 *
 * Read-only, no interactive actions — so unlike /admin/vendors this page
 * fetches server-side directly via listLeadsForAdmin() rather than a client
 * component hitting GET /api/internal/leads. That API route still exists
 * (for any future consumer), it's just not what this page itself uses.
 *
 * Covered by middleware.ts's Basic Auth gate (/admin/:path*).
 */

import Link from "next/link";
import { listLeadsForAdmin } from "@/services/lead/leadService";

export default async function AdminLeadsPage() {
  const leads = await listLeadsForAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Leads ({leads.length})</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/vendors" className="text-zinc-400 hover:text-amber-400 underline">
            Vendors
          </Link>
          <Link href="/admin/reports" className="text-zinc-400 hover:text-amber-400 underline">
            Reports
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm bg-zinc-950/80">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="px-4 py-2 font-medium">Lead ID</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Event Type</th>
              <th className="px-4 py-2 font-medium">City</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Qualification</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.publicLeadId}
                className="text-zinc-100 border-b border-zinc-800/60 last:border-b-0"
              >
                <td className="px-4 py-2 font-mono text-xs">
                  <Link
                    href={`/admin/leads/${lead.publicLeadId}`}
                    className="hover:text-amber-400 underline"
                  >
                    {lead.publicLeadId}
                  </Link>
                </td>
                <td className="px-4 py-2">{lead.customerName}</td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-300">{lead.phone}</td>
                <td className="px-4 py-2">{lead.eventType}</td>
                <td className="px-4 py-2 text-zinc-400">{lead.city}</td>
                <td className="px-4 py-2 text-zinc-400">{lead.status}</td>
                <td className="px-4 py-2 text-zinc-400">{lead.qualificationStatus}</td>
                <td className="px-4 py-2 text-zinc-400">
                  {new Date(lead.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
