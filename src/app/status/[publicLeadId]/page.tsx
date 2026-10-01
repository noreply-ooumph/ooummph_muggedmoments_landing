/**
 * MuggedMoments — /status/[publicLeadId]
 *
 * Thin server wrapper — unwraps the async `params` (Next.js 16 convention, same as the
 * API routes) and hands a plain string to the client component that does the fetching.
 */

import { StatusPageClient } from "./StatusPageClient";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ publicLeadId: string }>;
}) {
  const { publicLeadId } = await params;

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
      <StatusPageClient publicLeadId={publicLeadId} />
    </div>
  );
}
