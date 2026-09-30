/**
 * MuggedMoments — /vendor (Vendor Auth: phone -> login or register, no OTP)
 *
 * OTP verification was removed per explicit request — see
 * src/app/api/vendor/login/route.ts's header comment for the security note
 * that removal carries. Two steps now:
 *  1. Enter phone -> POST /api/vendor/login
 *     - Existing vendor: session cookie is set server-side -> redirect to dashboard.
 *     - New phone number: branch to the registration form (still within this page).
 *  2. (New vendor only) Fill business name/city/services -> POST /api/vendor/register
 *     -> session cookie set -> redirect to dashboard.
 */

"use client";

import { useState } from "react";
import { getActiveServices } from "@/config/services";
import { useAttribution } from "@/hooks/useAttribution";

type Step = "phone" | "register";

export default function VendorAuthPage() {
  const attribution = useAttribution();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeServices = getActiveServices();

  // "Vendor Login" alone is misleading for someone arriving here for the
  // first time (e.g. from /join-as-vendor) who has never registered — at the
  // phone-entry step we don't yet know whether this number is new or
  // existing (that's only determined after submitting it), so the heading
  // stays neutral to both cases until the flow itself branches.
  const heading =
    step === "register" ? "Create Your Vendor Account" : "Vendor Login / Sign Up";

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      if (json.isNewVendor) {
        setStep("register");
      } else {
        window.location.href = "/vendor/dashboard";
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name,
          city,
          services: selectedServices,
          attribution: attribution ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }
      window.location.href = "/vendor/dashboard";
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleService(slug: string) {
    setSelectedServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-xl border border-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">{heading}</h1>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
            {error}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Phone number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
                placeholder="+91 98765 43210"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
            >
              {submitting ? "Continuing..." : "Continue"}
            </button>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-zinc-400">
              We don&apos;t recognize this number yet — let&apos;s set up your vendor profile.
            </p>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Business name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Services you offer</label>
              <div className="grid grid-cols-2 gap-2">
                {activeServices.map((s) => (
                  <label key={s.slug} className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(s.slug)}
                      onChange={() => toggleService(s.slug)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || selectedServices.length === 0}
              className="w-full rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
            >
              {submitting ? "Creating account..." : "Create vendor account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
