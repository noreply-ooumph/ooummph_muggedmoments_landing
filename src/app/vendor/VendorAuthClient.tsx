/**
 * MuggedMoments — /vendor (Vendor Auth Client: phone -> login or register, no OTP)
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

export function VendorAuthClient() {
  const attribution = useAttribution();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeServices = getActiveServices();

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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">{heading}</h1>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
            {error}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="vendor-auth-phone" className="block text-sm text-zinc-400 mb-1">
                Phone number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold select-none">
                  🇮🇳 +91
                </span>
                <input
                  id="vendor-auth-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 pl-16 pr-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
                  placeholder="98765 43210"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Enter your 10-digit registered business mobile number
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-white hover:bg-zinc-200 text-zinc-900 font-medium py-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Continuing..." : "Continue"}
            </button>
          </form>
        )}

        {step === "register" && (
          <>
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-sm text-zinc-400">
                We don&apos;t recognize this number yet — let&apos;s set up your vendor profile.
              </p>
              <div>
                <label htmlFor="vendor-reg-name" className="block text-sm text-zinc-400 mb-1 font-medium">
                  Business name
                </label>
                <input
                  id="vendor-reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800/90 border border-zinc-700 px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="e.g. Royal Wedding Photography"
                />
              </div>
              <div>
                <label htmlFor="vendor-reg-city" className="block text-sm text-zinc-400 mb-1 font-medium">
                  City
                </label>
                <input
                  id="vendor-reg-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800/90 border border-zinc-700 px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="e.g. Lucknow"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-medium">Services you offer</label>
                <div className="grid grid-cols-2 gap-2">
                  {activeServices.map((s) => (
                    <label key={s.slug} htmlFor={`service-${s.slug}`} className="flex items-center gap-2.5 text-xs text-zinc-200 bg-zinc-800/60 border border-zinc-700/60 p-2.5 rounded-xl hover:border-amber-500/40 cursor-pointer transition-all">
                      <input
                        id={`service-${s.slug}`}
                        type="checkbox"
                        checked={selectedServices.includes(s.slug)}
                        onChange={() => toggleService(s.slug)}
                        className="accent-amber-500 rounded"
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || selectedServices.length === 0}
                className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold py-3 text-sm disabled:opacity-50 transition-all shadow-md shadow-amber-400/10"
              >
                {submitting ? "Creating account..." : "Create vendor account"}
              </button>
            </form>

            {/* Catchy WhatsApp Community Section */}
            <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
              <div className="bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border border-emerald-500/40 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <span className="text-xl">💬</span>
                  <h3 className="text-sm font-bold text-emerald-300 tracking-tight">
                    Join Official Vendor WhatsApp Network
                  </h3>
                </div>
                <p className="text-xs text-zinc-300 mb-3.5 leading-relaxed">
                  ⚡ Get instant client lead alerts, priority booking updates, and connect with top event partners in your region!
                </p>
                <a
                  href="https://chat.whatsapp.com/D7TWeA4gF2cBHaXbzXF7Qi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20"
                >
                  <span>Join WhatsApp Group Now</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
