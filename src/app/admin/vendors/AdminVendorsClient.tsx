/**
 * MuggedMoments — /admin/vendors client logic
 *
 * Loading/error state pattern matches ThankYouClient.tsx/StatusPageClient.tsx
 * (loading text, error text) — no new UX pattern invented for this page.
 *
 * v1 scope: Approve/Reject now goes through a confirmation modal (reusing the
 * existing Modal component, not a raw window.confirm()) before firing the
 * PATCH — added after the initial v1 build. Still no undo once decided.
 */

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Modal } from "@/components/ui";

interface AdminVendor {
  id: string;
  name: string;
  city: string;
  contactPhone: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
}

export function AdminVendorsClient() {
  const [vendors, setVendors] = useState<AdminVendor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    vendorId: string;
    vendorName: string;
    status: "VERIFIED" | "REJECTED";
  } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<{
    vendorId: string;
    vendorName: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/internal/vendors")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not load vendors.");
          return;
        }
        const json = (await res.json()) as { vendors: AdminVendor[] };
        setVendors(json.vendors);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load vendors.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDecision(vendorId: string, status: "VERIFIED" | "REJECTED") {
    setPendingActionId(vendorId);
    try {
      const res = await fetch(`/api/internal/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setVendors((prev) =>
        prev
          ? prev.map((v) => (v.id === vendorId ? { ...v, verificationStatus: status } : v))
          : prev
      );
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleDelete(vendorId: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/internal/vendors/${vendorId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json?.error?.message ?? "Could not delete this vendor.");
        return;
      }
      setVendors((prev) => (prev ? prev.filter((v) => v.id !== vendorId) : prev));
      setConfirmingDelete(null);
    } catch {
      setDeleteError("Could not reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
        <p>Loading vendors…</p>
      </div>
    );
  }

  if (error || !vendors) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
        <p>{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Vendors ({vendors.length})</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/leads" className="text-zinc-400 hover:text-amber-400 underline">
            Leads
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
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">City</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr
                key={vendor.id}
                className="text-zinc-100 border-b border-zinc-800/60 last:border-b-0"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/vendors/${vendor.id}`}
                    className="hover:text-amber-400 underline"
                  >
                    {vendor.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-400">{vendor.city}</td>
                <td className="px-4 py-2 text-zinc-400">{vendor.contactPhone ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-400">{vendor.verificationStatus}</td>
                <td className="px-4 py-2">
                  {vendor.verificationStatus === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={pendingActionId === vendor.id}
                        onClick={() =>
                          setConfirming({
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            status: "VERIFIED",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={pendingActionId === vendor.id}
                        onClick={() =>
                          setConfirming({
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            status: "REJECTED",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : vendor.verificationStatus === "REJECTED" ? (
                    /* REJECTED → offer Approve so ops can reverse the decision */
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={pendingActionId === vendor.id}
                        onClick={() =>
                          setConfirming({
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            status: "VERIFIED",
                          })
                        }
                      >
                        Approve
                      </Button>
                    </div>
                  ) : vendor.verificationStatus === "VERIFIED" ? (
                    /* VERIFIED → offer Reject so ops can revoke if needed */
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={pendingActionId === vendor.id}
                        onClick={() =>
                          setConfirming({
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            status: "REJECTED",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmingDelete({ vendorId: vendor.id, vendorName: vendor.name })
                    }
                    className={`text-xs text-red-400 underline hover:text-red-300 ${
                      vendor.verificationStatus === "PENDING" ? "mt-2 block" : ""
                    }`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Confirm"
      >
        {confirming && (
          <div className="flex flex-col gap-4">
            <p className="text-zinc-200">
              {confirming.status === "VERIFIED" ? "Approve" : "Reject"}{" "}
              <span className="font-semibold">{confirming.vendorName}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={pendingActionId === confirming.vendorId}
                onClick={async () => {
                  await handleDecision(confirming.vendorId, confirming.status);
                  setConfirming(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirmingDelete !== null}
        onClose={() => {
          setConfirmingDelete(null);
          setDeleteError(null);
        }}
        title="Delete this vendor?"
      >
        {confirmingDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-zinc-200 text-sm">
              This permanently deletes{" "}
              <span className="font-semibold">{confirmingDelete.vendorName}</span> — their
              profile, portfolio images, brochure documents, every match, opportunity, quote,
              message, and booking tied to them. This cannot be undone.
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
                onClick={() => {
                  setConfirmingDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={deleting}
                onClick={() => handleDelete(confirmingDelete.vendorId)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
