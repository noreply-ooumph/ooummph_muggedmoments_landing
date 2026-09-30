/**
 * MuggedMoments — /admin/reports
 *
 * Server component, calls computeFunnelReport()/computeVendorResponseReport()
 * directly — same direct-service-call architecture as /admin/leads. Both
 * report functions were fully built and tested but had no UI anywhere until
 * this page.
 *
 * Range defaults to all-time (epoch -> now) since no date-picker UI was
 * requested and an all-time default is the most useful with this little
 * historical data. Combined into one page rather than two, since both
 * reports are small enough to view together without separate navigation.
 *
 * Covered by middleware.ts's Basic Auth gate (/admin/:path*).
 */

import {
  computeFunnelReport,
  computeVendorResponseReport,
} from "@/domain/analytics/funnelService";

export default async function AdminReportsPage() {
  const range = { from: new Date(0), to: new Date() };
  const [funnel, vendorResponse] = await Promise.all([
    computeFunnelReport(range),
    computeVendorResponseReport(range),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Reports (all-time)</h1>

      <h2 className="text-lg font-bold text-white mb-3">Funnel</h2>
      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 mb-10">
        {funnel.map((row) => (
          <div key={row.stage} className="p-4 flex items-center justify-between text-sm">
            <span className="text-zinc-300">{row.stage}</span>
            <span className="text-white font-semibold">{row.count}</span>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-white mb-3">Vendor response</h2>
      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800/60">
        <div className="p-4 flex items-center justify-between text-sm">
          <span className="text-zinc-300">Total requests</span>
          <span className="text-white font-semibold">{vendorResponse.totalRequests}</span>
        </div>
        <div className="p-4 flex items-center justify-between text-sm">
          <span className="text-zinc-300">Responded</span>
          <span className="text-white font-semibold">{vendorResponse.respondedCount}</span>
        </div>
        <div className="p-4 flex items-center justify-between text-sm">
          <span className="text-zinc-300">Response rate</span>
          <span className="text-white font-semibold">
            {(vendorResponse.responseRate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="p-4 flex items-center justify-between text-sm">
          <span className="text-zinc-300">Average response time</span>
          <span className="text-white font-semibold">
            {vendorResponse.averageResponseTimeMs !== null
              ? `${Math.round(vendorResponse.averageResponseTimeMs / 60000)} min`
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
