/**
 * MuggedMoments — Success Confirmation Component
 *
 * Stage 4 (Capture Success) & Stage 5 (Reassure) interface.
 * Displays:
 * - Public Lead Reference Code (MM-XXXXXXXX)
 * - Lead Completeness Badge (COMPLETE | INCOMPLETE)
 * - Transparent Next Steps (Stage 6 Convert preview)
 * - Customer Support / WhatsApp channel reassurance
 * - Reset button to submit another event request
 */

"use client";

import React, { useState } from "react";
import { Button, Input, MultiSelectChips, Alert } from "@/components/ui";
import { getActiveServices } from "@/config/services";
import { MatchList } from "@/components/matches/MatchList";
import type { PublicVendorMatch, QualificationStatus } from "@/types";

interface LeadSuccessData {
  leadId: string;
  publicLeadId: string;
  status: string;
  completenessStatus: "COMPLETE" | "INCOMPLETE" | "PENDING";
  missingFields: string[];
  score?: number;
  matchedRules?: any[];
  nextAction: string;
  customerName?: string;
  phone?: string;
  whatsappConsent?: boolean;
  qualificationStatus?: QualificationStatus;
  matches?: PublicVendorMatch[];
}

// Fields the /api/leads/[publicLeadId] PATCH endpoint (Stage 9 resume flow) can
// actually accept — customerName/phone are always required at initial submission
// (CreateLeadSchema), so they can never legitimately appear in missingFields.
const RESUMABLE_FIELDS = ["eventDate", "guestCount", "budget", "services"] as const;
type ResumableField = (typeof RESUMABLE_FIELDS)[number];

function isResumableField(field: string): field is ResumableField {
  return (RESUMABLE_FIELDS as readonly string[]).includes(field);
}

interface SuccessConfirmationProps {
  data?: LeadSuccessData;
  response?: LeadSuccessData;
  onReset?: () => void;
}

export function SuccessConfirmation({ data: propData, response, onReset }: SuccessConfirmationProps) {
  const initialData = (propData || response) as LeadSuccessData;
  const [copied, setCopied] = useState(false);
  // Stage 9 resume flow: local copy so the badge/missing-fields list can update in
  // place after a successful PATCH, without requiring the parent to re-fetch.
  const [data, setData] = useState<LeadSuccessData>(initialData);
  const [resumeValues, setResumeValues] = useState<{
    eventDate?: string;
    guestCount?: number;
    budget?: string;
    services?: string[];
  }>({});
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const services = getActiveServices();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.publicLeadId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resumableMissingFields = data.missingFields.filter(isResumableField);

  // Matching in this app runs synchronously within the same request that
  // created the lead (see matchingService.ts's own header comment) — by the
  // time this page renders, matching has already finished. The header used to
  // claim "Match Pipeline Active" / "being matched" unconditionally, even
  // while the fully-computed match list (or MatchList's own honest "no match
  // yet" state) rendered right below it on the same page — a real contradiction,
  // not just stale copy. This reflects what's actually about to be shown,
  // instead of implying an ongoing process that has already completed.
  const hasRoutedMatches =
    data.qualificationStatus === "ROUTED" && (data.matches?.length ?? 0) > 0;

  async function handleResumeSubmit() {
    setIsResuming(true);
    setResumeError(null);

    try {
      const response = await fetch(`/api/leads/${data.publicLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeValues),
      });

      const result = await response.json();

      if (!response.ok) {
        setResumeError(
          result?.error?.message ?? "Something went wrong. Please try again."
        );
        return;
      }

      setData((prev) => ({
        ...prev,
        completenessStatus: result.completenessStatus,
        missingFields: result.missingFields,
      }));
      setResumeValues({});
    } catch {
      setResumeError(
        "We couldn't submit your details right now. Your information is still here — please try again."
      );
    } finally {
      setIsResuming(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 text-zinc-100 shadow-2xl transition-all">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl font-bold">
            ✓
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              {hasRoutedMatches ? "Request Received — Vendors Matched" : "Request Received"}
            </h2>
            <p className="text-xs text-zinc-400">
              {hasRoutedMatches
                ? "Here's who matches your event, shown below."
                : "We'll notify you as soon as a matching vendor becomes available."}
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            data.completenessStatus === "COMPLETE"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          {data.completenessStatus === "COMPLETE"
            ? "Complete Profile"
            : "Partial Profile"}
        </span>
      </div>

      {/* Public Reference Code Card */}
      <div className="bg-zinc-950/80 rounded-xl p-5 border border-zinc-800/80 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Your Tracking Reference
          </span>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
            {data.publicLeadId}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Keep this code to reference your event request with customer support.
          </p>
          <a
            href={`/status/${data.publicLeadId}`}
            className="inline-block text-xs text-amber-400 hover:text-amber-300 underline mt-1"
          >
            Check status later with this code →
          </a>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="whitespace-nowrap bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs"
        >
          {copied ? "Copied! ✓" : "Copy Code"}
        </Button>
      </div>

      {/* Stage 5 Reassurance Timeline */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          What Happens Next
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs border border-amber-500/40">
              1
            </div>
            <div>
              <p className="font-medium text-zinc-200">
                Deterministic Vendor Availability Query
              </p>
              <p className="text-xs text-zinc-400">
                Our matching algorithm cross-references your event details with active, verified local creators.
              </p>
            </div>
          </div>

          <div className="flex gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center shrink-0 text-xs border border-zinc-700">
              2
            </div>
            <div>
              <p className="font-medium text-zinc-200">
                Curated Vendor Match Delivery
              </p>
              <p className="text-xs text-zinc-400">
                {data.whatsappConsent
                  ? "You will receive verified vendor options via WhatsApp and direct message shortly."
                  : "Matched vendors will review your requirements and reach out via phone/email."}
              </p>
            </div>
          </div>

          <div className="flex gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center shrink-0 text-xs border border-zinc-700">
              3
            </div>
            <div>
              <p className="font-medium text-zinc-200">
                Zero-Obligation Consultation
              </p>
              <p className="text-xs text-zinc-400">
                Review portfolios, compare pricing transparently, and confirm only when completely confident.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stage 15 (Discovery, minimal slice): show already-computed vendor matches */}
      <MatchList
        qualificationStatus={data.qualificationStatus ?? "CAPTURED"}
        matches={data.matches ?? []}
        suppressIncompleteNote
      />

      {/* Incomplete warning + resume form (Stage 9 "Continue" flow) */}
      {data.completenessStatus === "INCOMPLETE" && data.missingFields.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 mb-6">
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            You&apos;re almost done
          </h4>
          <p className="text-xs text-amber-200/80 mb-4">
            {resumableMissingFields.length} detail
            {resumableMissingFields.length === 1 ? "" : "s"} still needed to find
            suitable options:{" "}
            <span className="font-semibold text-amber-300">
              {data.missingFields.join(", ")}
            </span>
          </p>

          {resumableMissingFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {resumeError && <Alert type="error">{resumeError}</Alert>}

              {resumableMissingFields.includes("eventDate") && (
                <Input
                  id="resume-event-date"
                  label="Event Date"
                  type="date"
                  value={resumeValues.eventDate ?? ""}
                  onChange={(e) =>
                    setResumeValues((prev) => ({
                      ...prev,
                      eventDate: e.target.value,
                    }))
                  }
                />
              )}

              {resumableMissingFields.includes("guestCount") && (
                <Input
                  id="resume-guest-count"
                  label="Approximate Guest Count"
                  type="number"
                  min={1}
                  max={100000}
                  value={resumeValues.guestCount?.toString() ?? ""}
                  onChange={(e) =>
                    setResumeValues((prev) => ({
                      ...prev,
                      guestCount: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    }))
                  }
                />
              )}

              {resumableMissingFields.includes("budget") && (
                <Input
                  id="resume-budget"
                  label="Approximate Budget"
                  type="text"
                  placeholder="e.g. ₹5,00,000"
                  value={resumeValues.budget ?? ""}
                  onChange={(e) =>
                    setResumeValues((prev) => ({
                      ...prev,
                      budget: e.target.value,
                    }))
                  }
                />
              )}

              {resumableMissingFields.includes("services") && (
                <MultiSelectChips
                  label="What services do you need?"
                  options={services.map((s) => ({ value: s.slug, label: s.name }))}
                  value={resumeValues.services ?? []}
                  onChange={(selected) =>
                    setResumeValues((prev) => ({ ...prev, services: selected }))
                  }
                />
              )}

              <Button
                variant="primary"
                size="sm"
                loading={isResuming}
                onClick={handleResumeSubmit}
                className="self-start"
              >
                {isResuming ? "Saving..." : "Continue"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action footer */}
      <div className="border-t border-zinc-800 pt-5 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          MuggedMoments Engine • Stage 4 Captured
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onReset}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
        >
          Submit Another Request
        </Button>
      </div>
    </div>
  );
}
