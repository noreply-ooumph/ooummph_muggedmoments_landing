/**
 * MuggedMoments — Admin Vendor Detail Actions (edit + delete)
 *
 * Client component so ops can correct a vendor's profile data or remove a
 * vendor entirely without direct DB access — mirrors AdminLeadDetailCard.tsx's
 * exact structure (view/edit toggle, comma-separated slug inputs rather than
 * the vendor's own fancier chip UI in EditProfileClient.tsx, a delete
 * confirmation Modal). See updateVendorDetailsForAdmin()/deleteVendorForAdmin()
 * in adminVendorService.ts for the full reasoning behind what's editable here
 * and what deletion actually removes.
 *
 * Deliberately does NOT expose verificationStatus (Approve/Reject) here —
 * that decision already has its own dedicated flow on the /admin/vendors list
 * page (AdminVendorsClient.tsx); duplicating it here would give ops two
 * different places to change the same field.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button, Modal } from "@/components/ui";

interface AdminVendorDetail {
  id: string;
  name: string;
  city: string;
  about: string | null;
  startingPrice: number | null;
  serviceAreas: string[];
  services: string[];
}

interface AdminVendorDetailActionsProps {
  initialDetail: AdminVendorDetail;
}

export function AdminVendorDetailActions({ initialDetail }: AdminVendorDetailActionsProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(detail.name);
  const [city, setCity] = useState(detail.city);
  const [about, setAbout] = useState(detail.about ?? "");
  const [startingPrice, setStartingPrice] = useState(
    detail.startingPrice !== null ? String(detail.startingPrice) : ""
  );
  const [serviceAreasText, setServiceAreasText] = useState(detail.serviceAreas.join(", "));
  const [servicesText, setServicesText] = useState(detail.services.join(", "));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEditing() {
    setName(detail.name);
    setCity(detail.city);
    setAbout(detail.about ?? "");
    setStartingPrice(detail.startingPrice !== null ? String(detail.startingPrice) : "");
    setServiceAreasText(detail.serviceAreas.join(", "));
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
      const res = await fetch(`/api/internal/vendors/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city,
          about,
          startingPrice: startingPrice === "" ? undefined : Number(startingPrice),
          serviceAreas: serviceAreasText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
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
      setDetail((prev) => ({
        ...prev,
        name: json.name,
        city: json.city,
        about: json.about,
        startingPrice: json.startingPrice,
        serviceAreas: json.serviceAreas,
        services: json.services,
      }));
      setEditing(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/internal/vendors/${detail.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json?.error?.message ?? "Could not delete this vendor.");
        return;
      }
      router.push("/admin/vendors");
      router.refresh();
    } catch {
      setDeleteError("Could not reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-zinc-800 p-6 mb-6 space-y-4"
      >
        <p className="text-sm font-semibold text-zinc-200">Edit vendor details</p>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Business Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            error={fieldErrors.city}
          />
          <Input
            label="Starting Price (INR)"
            type="number"
            min={0}
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            error={fieldErrors.startingPrice}
          />
          <Input
            label="Service Areas (comma-separated)"
            value={serviceAreasText}
            onChange={(e) => setServiceAreasText(e.target.value)}
            error={fieldErrors.serviceAreas}
          />
          <div className="col-span-2">
            <Input
              label="About"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              error={fieldErrors.about}
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Services offered (comma-separated slugs)"
              value={servicesText}
              onChange={(e) => setServicesText(e.target.value)}
              error={fieldErrors.services}
              helpText="e.g. photography, catering. This does not retroactively change any opportunity or match this vendor already has."
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
    <>
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={startEditing}
          className="text-xs text-amber-400 underline hover:text-amber-300"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="text-xs text-red-400 underline hover:text-red-300"
        >
          Delete
        </button>
      </div>

      <Modal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete this vendor?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-zinc-200 text-sm">
            This permanently deletes <span className="font-semibold">{detail.name}</span> —
            their profile, portfolio images, brochure documents, every match, opportunity,
            quote, message, and booking tied to them. This cannot be undone.
          </p>
          {deleteError && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
              {deleteError}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={deleting} onClick={handleDelete}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
