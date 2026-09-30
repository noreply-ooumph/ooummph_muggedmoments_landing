/**
 * MuggedMoments — Thank You page client logic
 *
 * Reachable directly (e.g. a bookmarked or shared link) via ?leadId=<publicLeadId>,
 * independent of the homepage's existing modal → inline SuccessConfirmation flow,
 * which is left completely unchanged by this addition (see implementation report).
 *
 * Fetches the existing GET /api/leads/[publicLeadId] endpoint and renders the same
 * SuccessConfirmation component already used inline on the homepage, so the two
 * surfaces show identical content rather than a second, diverging implementation.
 *
 * NOTE: the GET /api/leads/[publicLeadId] response does not include `leadId`
 * (internal id) or `nextAction` — both fields SuccessConfirmation's prop type
 * declares as required but never actually reads in its render body. They are
 * filled with an empty-string placeholder below purely to satisfy the type;
 * this has no visible effect on the rendered page.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SuccessConfirmation } from "@/components/success/SuccessConfirmation";
import { track } from "@/lib/analytics";
import type { PublicVendorMatch, QualificationStatus } from "@/types";

interface LeadStatusResponse {
  publicLeadId: string;
  status: string;
  completenessStatus: "COMPLETE" | "INCOMPLETE" | "PENDING";
  missingFields: string[];
  qualificationStatus: QualificationStatus;
  matches: PublicVendorMatch[];
  whatsappConsent: boolean;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export function ThankYouClient() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");

  const [data, setData] = useState<LeadStatusResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/leads/${encodeURIComponent(leadId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setError("We couldn't load your request right now.");
          return;
        }
        const json = (await res.json()) as LeadStatusResponse;
        setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setError("We couldn't load your request right now.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (!leadId) {
    return (
      <div className="max-w-lg mx-auto text-center text-zinc-400">
        <p>No request reference was provided.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto text-center text-zinc-400">
        <p>Loading your request…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto text-center text-zinc-400">
        <p>We couldn&apos;t find a request with that reference.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto text-center text-zinc-400">
        <p>{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Hi MuggedMoments, following up on my request ${data.publicLeadId}.`
      )}`
    : null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SuccessConfirmation
        data={{
          // See file-level note: leadId/nextAction are required by the prop
          // type but unused in the component's render — placeholders only.
          leadId: "",
          nextAction: "",
          publicLeadId: data.publicLeadId,
          status: data.status,
          completenessStatus: data.completenessStatus,
          missingFields: data.missingFields,
          qualificationStatus: data.qualificationStatus,
          matches: data.matches,
          whatsappConsent: data.whatsappConsent,
        }}
      />

      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_handoff", { publicLeadId: data.publicLeadId })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-5 py-3 transition-colors self-center"
        >
          Continue on WhatsApp
        </a>
      )}

      <div className="flex items-center justify-center gap-6 text-xs text-zinc-400">
        <a href={`/status/${data.publicLeadId}`} className="hover:text-amber-400 underline">
          Check your status anytime
        </a>
        <a href="/#faq" className="hover:text-amber-400 underline">
          Read the FAQ
        </a>
      </div>
    </div>
  );
}
