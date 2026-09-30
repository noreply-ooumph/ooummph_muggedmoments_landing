/**
 * MuggedMoments — Admin Lead Detail Card (view + correction)
 *
 * Client component so ops can correct a customer's data-entry mistake (wrong
 * phone digit, misspelled city, etc.) without direct DB access — see
 * updateLeadDetailsForAdmin() in leadService.ts for the full trust-model
 * reasoning behind exactly which fields are editable here and why.
 *
 * Receives the server-fetched AdminLeadDetail as initial state and applies the
 * PATCH response directly to local state on save — no refetch needed, since
 * updateLeadDetailsForAdmin() already returns the full updated shape.
 */

"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import type { AdminLeadDetail } from "@/services/lead/leadService";

interface AdminLeadDetailCardProps {
  initialDetail: AdminLeadDetail;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function AdminLeadDetailCard({ initialDetail }: AdminLeadDetailCardProps) {
  const [detail, setDetail] = useState(initialDetail);
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState(detail.customerName);
  const [phone, setPhone] = useState(detail.phone);
  const [city, setCity] = useState(detail.city);
  const [locality, setLocality] = useState(detail.locality ?? "");
  const [eventDate, setEventDate] = useState(toDateInputValue(detail.eventDate));
  const [guestCount, setGuestCount] = useState(detail.guestCount?.toString() ?? "");
  const [budget, setBudget] = useState(detail.budget ?? "");
  const [servicesText, setServicesText] = useState(detail.services.join(", "));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setCustomerName(detail.customerName);
    setPhone(detail.phone);
    setCity(detail.city);
    setLocality(detail.locality ?? "");
    setEventDate(toDateInputValue(detail.eventDate));
    setGuestCount(detail.guestCount?.toString() ?? "");
    setBudget(detail.budget ?? "");
    setServicesText(detail.services.join(", "));
    setError(null);
    setFieldErrors({});
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/internal/leads/${detail.publicLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          city,
          locality: locality || undefined,
          eventDate: eventDate || undefined,
          guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
          budget: budget || undefined,
          services: servicesText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFieldErrors(json?.error?.fields ?? {});
        setError(json?.error?.message ?? "Could not save changes.");
        return;
      }
      setDetail(json as AdminLeadDetail);
      setEditing(false);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-zinc-800 p-6 mb-6 space-y-4"
      >
        <p className="text-sm font-semibold text-zinc-200">Edit lead details</p>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={fieldErrors.customerName}
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors.phone}
          />
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            error={fieldErrors.city}
          />
          <Input
            label="Locality / Area"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            error={fieldErrors.locality}
          />
          <Input
            label="Event Date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            error={fieldErrors.eventDate}
          />
          <Input
            label="Guest Count"
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            error={fieldErrors.guestCount}
          />
          <Input
            label="Budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            error={fieldErrors.budget}
          />
          <div className="col-span-2">
            <Input
              label="Services (comma-separated slugs)"
              value={servicesText}
              onChange={(e) => setServicesText(e.target.value)}
              error={fieldErrors.services}
              helpText="e.g. photography, catering. Matching already ran once and never re-runs — changing city/services here does not update vendors already matched against the original values."
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting} size="sm">
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={submitting}
            className="text-xs text-zinc-400 underline hover:text-zinc-200 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-zinc-500 uppercase tracking-wide">Requirement Details</span>
        <button
          type="button"
          onClick={startEditing}
          className="text-xs text-amber-400 underline hover:text-amber-300"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Customer</span>
          <span className="text-zinc-100">{detail.customerName}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Phone</span>
          <span className="text-zinc-100 font-mono">{detail.phone}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Event Type</span>
          <span className="text-zinc-100">{detail.eventType}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">City</span>
          <span className="text-zinc-100">{detail.city}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Locality / Area</span>
          <span className="text-zinc-100">{detail.locality ?? "Not set"}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Event Date</span>
          <span className="text-zinc-100">
            {detail.eventDate ? new Date(detail.eventDate).toLocaleDateString() : "Not set"}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Guest Count</span>
          <span className="text-zinc-100">{detail.guestCount ?? "Not set"}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Budget</span>
          <span className="text-zinc-100">{detail.budget ?? "Not set"}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Status</span>
          <span className="text-zinc-100">
            {detail.status} · {detail.completenessStatus} · {detail.qualificationStatus}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Services Requested</span>
          <span className="text-zinc-100">
            {detail.services.length > 0 ? detail.services.join(", ") : "None recorded"}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-zinc-500 block text-xs uppercase tracking-wide">Contact Consent</span>
          <span className="text-zinc-100">
            WhatsApp: {detail.whatsappConsent ? "Yes" : "No"} · Email: {detail.emailOptIn ? "Yes" : "No"} · SMS:{" "}
            {detail.smsOptIn ? "Yes" : "No"}
          </span>
        </div>
        {detail.dynamicAnswers && Object.keys(detail.dynamicAnswers).length > 0 && (
          <div className="col-span-2">
            <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-1">
              Additional Answers
            </span>
            <div className="text-zinc-100 space-y-1">
              {Object.entries(detail.dynamicAnswers).map(([key, value]) => (
                <div key={key}>
                  <span className="text-zinc-400">{key}:</span>{" "}
                  {typeof value === "string" || typeof value === "number"
                    ? String(value)
                    : JSON.stringify(value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
