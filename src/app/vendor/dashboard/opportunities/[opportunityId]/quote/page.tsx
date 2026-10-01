/**
 * MuggedMoments — /vendor/dashboard/opportunities/[opportunityId]/quote (Stage 18, Phase 18.1/18.4)
 *
 * Session-gated + ownership-checked, same principle as the opportunity detail page.
 * A vendor can only reach this page for an opportunity they've already said yes to
 * (INTERESTED, QUOTE_PENDING, or QUOTE_SUBMITTED) — anything else is a 404.
 *
 * Shows the DRAFT version if one exists (editable — whether it's the first-ever
 * draft or an in-progress revision), otherwise the current SUBMITTED version
 * read-only with a "Revise Quote" option (Stage 18, Phase 18.4).
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getVendorSession } from "@/lib/vendorSession";
import { getCurrentVersion, getDraftVersion } from "@/domain/quote/quoteVersionService";
import prisma from "@/lib/db/prisma";
import { QuoteBuilderClient } from "./QuoteBuilderClient";
import { VendorMessageThread } from "./VendorMessageThread";

const REACHABLE_STATUSES = ["INTERESTED", "QUOTE_PENDING", "QUOTE_SUBMITTED"];

export default async function VendorQuoteBuilderPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const session = await getVendorSession();
  if (!session) {
    redirect("/vendor");
  }

  const { opportunityId } = await params;

  const opportunity = await prisma.vendorOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      quote: {
        include: {
          versions: { include: { lineItems: { orderBy: { order: "asc" } } } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!opportunity || opportunity.vendorId !== session.vendorId) {
    notFound();
  }

  if (!REACHABLE_STATUSES.includes(opportunity.status)) {
    notFound();
  }

  const versions = opportunity.quote?.versions ?? [];
  const draft = getDraftVersion(versions);
  const current = getCurrentVersion(versions);
  const shown = draft ?? current;

  return (
    <>
      <QuoteBuilderClient
        // Remount with fresh initial state whenever the shown version changes
        // (e.g. right after starting a revision) — this component's fields are
        // seeded from props only once, on mount.
        key={shown?.id ?? "empty"}
        opportunityId={opportunity.id}
        canRevise={!draft && !!current}
        canDiscard={!!draft && !!current}
        quote={
          shown
            ? {
                status: shown.status,
                versionNumber: shown.versionNumber,
                availabilityState: shown.availabilityState,
                validUntil: shown.validUntil ? shown.validUntil.toISOString() : null,
                notes: shown.notes,
                included: shown.included,
                excluded: shown.excluded,
                lineItems: shown.lineItems.map((item) => ({
                  label: item.label,
                  amount: item.amount,
                })),
              }
            : null
        }
      />
      <p className="w-full max-w-md mx-auto mt-4 text-xs text-zinc-500">
        Have a portfolio or brochure ready?{" "}
        <Link href="/vendor/dashboard/edit" className="underline hover:text-zinc-300">
          Add it to your profile once
        </Link>{" "}
        — it&apos;s shown automatically to customers, so you don&apos;t need to describe
        everything from scratch in every quote.
      </p>
      {current && (
        <div className="w-full max-w-md mx-auto mt-4 p-4 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800">
          <VendorMessageThread
            opportunityId={opportunity.id}
            messages={
              opportunity.quote?.messages.map((m) => ({
                senderType: m.senderType,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
              })) ?? []
            }
          />
        </div>
      )}
    </>
  );
}
