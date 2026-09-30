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
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
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
    </div>
  );
}
