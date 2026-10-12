"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getActiveServices } from "@/config/services";

const MAX_PORTFOLIO_ITEMS = 12;
const MAX_DOCUMENTS = 3;

interface PortfolioItem {
  id: string;
  imagePath: string;
}

interface VendorDocumentItem {
  id: string;
  filePath: string;
  originalFilename: string;
}

interface EditProfileClientProps {
  name: string;
  city: string;
  services: string[];
  about: string | null;
  startingPrice: number | null;
  serviceAreas: string[];
  profileComplete: boolean;
  portfolioItems: PortfolioItem[];
  documents: VendorDocumentItem[];
}

export function EditProfileClient({
  name: initialName,
  city: initialCity,
  services: initialServices,
  about: initialAbout,
  startingPrice: initialStartingPrice,
  serviceAreas: initialServiceAreas,
  profileComplete: initialProfileComplete,
  portfolioItems: initialPortfolioItems,
  documents: initialDocuments,
}: EditProfileClientProps) {
  const activeServices = getActiveServices();
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [services, setServices] = useState<string[]>(initialServices);
  const [about, setAbout] = useState(initialAbout ?? "");
  const [startingPrice, setStartingPrice] = useState(
    initialStartingPrice !== null ? String(initialStartingPrice) : ""
  );
  const [serviceAreas, setServiceAreas] = useState<string[]>(initialServiceAreas);
  const [newArea, setNewArea] = useState("");
  const [profileComplete, setProfileComplete] = useState(initialProfileComplete);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleService(slug: string) {
    setServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(initialPortfolioItems);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadPortfolioItem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPortfolioError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vendor/portfolio", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setPortfolioError(json?.error?.message ?? "Could not upload image.");
        return;
      }

      setPortfolioItems((prev) => [...prev, { id: json.id, imagePath: json.imagePath }]);
    } catch {
      setPortfolioError("Could not reach the server. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePortfolioItem(id: string) {
    setPortfolioError(null);
    try {
      const res = await fetch(`/api/vendor/portfolio/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        setPortfolioError(json?.error?.message ?? "Could not remove image.");
        return;
      }

      setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setPortfolioError("Could not reach the server. Please try again.");
    }
  }

  const [documents, setDocuments] = useState<VendorDocumentItem[]>(initialDocuments);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentError(null);
    setUploadingDocument(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vendor/documents", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setDocumentError(json?.error?.message ?? "Could not upload document.");
        return;
      }

      setDocuments((prev) => [
        ...prev,
        { id: json.id, filePath: json.filePath, originalFilename: json.originalFilename },
      ]);
    } catch {
      setDocumentError("Could not reach the server. Please try again.");
    } finally {
      setUploadingDocument(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  async function handleRemoveDocument(id: string) {
    setDocumentError(null);
    try {
      const res = await fetch(`/api/vendor/documents/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        setDocumentError(json?.error?.message ?? "Could not remove document.");
        return;
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch {
      setDocumentError("Could not reach the server. Please try again.");
    }
  }

  function addServiceArea() {
    const trimmed = newArea.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      setServiceAreas([...serviceAreas, trimmed]);
    }
    setNewArea("");
  }

  function removeServiceArea(area: string) {
    setServiceAreas(serviceAreas.filter((a) => a !== area));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city,
          services,
          about,
          startingPrice: startingPrice === "" ? undefined : Number(startingPrice),
          serviceAreas,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json?.error?.fields) {
          setFieldErrors(json.error.fields);
        }
        setError(json?.error?.message ?? "Something went wrong.");
        return;
      }

      setServices(json.services);
      setProfileComplete(json.profileComplete);
      setSaved(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      {/* Header Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Edit Vendor Profile</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Update your business details, services offered, starting pricing, and portfolio items.
          </p>
        </div>
        <Link
          href="/vendor/dashboard"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors border border-zinc-700/60"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {saved && (
        <div className="text-sm font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex items-center gap-2">
          <span>✓</span>
          <span>Profile saved successfully. Status is currently marked as <strong className="underline">{profileComplete ? "Complete (Ready for Matching)" : "Incomplete"}</strong>.</span>
        </div>
      )}

      {error && (
        <div className="text-sm font-semibold text-red-400 bg-red-950/40 border border-red-500/30 rounded-2xl p-4 shadow-lg flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Business Identity */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
            <span>🏢</span> Business Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 px-4 py-2.5 text-zinc-100 text-sm transition-all"
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Primary City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 px-4 py-2.5 text-zinc-100 text-sm transition-all"
              />
              {fieldErrors.city && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors.city}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Starting Price (INR)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">₹</span>
              <input
                type="number"
                min={0}
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 pl-8 pr-4 py-2.5 text-zinc-100 text-sm transition-all font-mono"
                placeholder="25000"
              />
            </div>
            {fieldErrors.startingPrice && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.startingPrice}</p>
            )}
          </div>
        </div>

        {/* Section 2: Services Selection */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>🛠️</span> Services You Offer
            </span>
            <span className="text-xs text-zinc-500 font-normal">
              Select all that apply
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeServices.map((s) => {
              const selected = services.includes(s.slug);
              return (
                <button
                  type="button"
                  key={s.slug}
                  onClick={() => toggleService(s.slug)}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                    selected
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/5"
                      : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                      selected
                        ? "bg-amber-400 text-zinc-950"
                        : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                    }`}
                  >
                    {selected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {fieldErrors.services && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.services}</p>
          )}
          <p className="text-xs text-zinc-500 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60">
            ℹ️ Changes to city or services here only affect matching for new requests submitted after you save — they don&apos;t retroactively change any opportunity or match you already have.
          </p>
        </div>

        {/* Section 3: Service Coverage Areas */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
            <span>🗺️</span> Service Coverage Areas
          </h2>

          <div className="flex flex-wrap gap-2 mb-2">
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-2 text-xs font-semibold bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-amber-300"
              >
                <span>📍 {area}</span>
                <button
                  type="button"
                  onClick={() => removeServiceArea(area)}
                  className="text-zinc-500 hover:text-red-400 text-base leading-none"
                  aria-label={`Remove ${area}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addServiceArea();
                }
              }}
              className="flex-1 rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-amber-400 px-4 py-2 text-zinc-100 text-xs"
              placeholder="Add a city or local area..."
            />
            <button
              type="button"
              onClick={addServiceArea}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700/60"
            >
              Add Area
            </button>
          </div>
          {fieldErrors.serviceAreas && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.serviceAreas}</p>
          )}
        </div>

        {/* Section 4: About Description */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>📝</span> Business Overview
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {about.length} / 2000 chars
            </span>
          </h2>

          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 p-4 text-zinc-100 text-sm leading-relaxed"
            placeholder="Tell potential clients about your experience, style, equipment, and values..."
          />
          {fieldErrors.about && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.about}</p>
          )}
        </div>

        {/* Submit Profile Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm rounded-xl transition-all shadow-xl shadow-amber-400/10 disabled:opacity-50"
        >
          {submitting ? "Saving Changes..." : "Save Profile Changes"}
        </button>
      </form>

      {/* Section 5: Portfolio Showcase Upload */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📸</span> Portfolio Photos ({portfolioItems.length}/{MAX_PORTFOLIO_ITEMS})
          </h2>
        </div>

        {portfolioError && (
          <div className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-500/30 rounded-xl p-3">
            {portfolioError}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {portfolioItems.map((item) => (
            <div key={item.id} className="relative aspect-square group rounded-xl overflow-hidden border border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element -- local disk-served static path, not an optimizable remote image */}
              <img
                src={item.imagePath}
                alt="Portfolio"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <button
                type="button"
                onClick={() => handleRemovePortfolioItem(item.id)}
                className="absolute top-1.5 right-1.5 bg-zinc-950/90 text-zinc-200 rounded-full w-6 h-6 text-sm font-bold flex items-center justify-center hover:bg-red-900 hover:text-white transition-colors"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {portfolioItems.length >= MAX_PORTFOLIO_ITEMS ? (
          <p className="text-xs text-zinc-500">
            You&apos;ve reached the maximum of {MAX_PORTFOLIO_ITEMS} images. Remove one to add another.
          </p>
        ) : (
          <div className="pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={handleUploadPortfolioItem}
              className="block w-full text-xs text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-amber-400 file:px-4 file:py-2.5 file:font-semibold hover:file:bg-zinc-700 disabled:opacity-50"
            />
          </div>
        )}
      </div>

      {/* Section 6: Document Uploads */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
        <div className="border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📄</span> Brochure / Documents ({documents.length}/{MAX_DOCUMENTS})
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Upload a PDF brochure to showcase your menu, packages, or services on your public profile.
          </p>
        </div>

        {documentError && (
          <div className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-500/30 rounded-xl p-3">
            {documentError}
          </div>
        )}

        {documents.length > 0 && (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 text-xs bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3"
              >
                <a
                  href={doc.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 font-semibold truncate hover:underline flex items-center gap-2"
                >
                  <span>📎</span> {doc.originalFilename || "Document.pdf"}
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="text-zinc-500 hover:text-red-400 font-bold text-sm shrink-0"
                  aria-label={`Remove ${doc.originalFilename}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {documents.length >= MAX_DOCUMENTS ? (
          <p className="text-xs text-zinc-500">
            You&apos;ve reached the maximum of {MAX_DOCUMENTS} documents.
          </p>
        ) : (
          <input
            ref={documentInputRef}
            type="file"
            accept="application/pdf"
            disabled={uploadingDocument}
            onChange={handleUploadDocument}
            className="block w-full text-xs text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-amber-400 file:px-4 file:py-2.5 file:font-semibold hover:file:bg-zinc-700 disabled:opacity-50"
          />
        )}
        {uploadingDocument && (
          <p className="text-xs text-amber-400 mt-2">Scanning and uploading document...</p>
        )}
      </div>
    </div>
  );
}
