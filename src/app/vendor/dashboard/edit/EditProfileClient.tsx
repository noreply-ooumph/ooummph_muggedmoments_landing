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
    <div className="w-full max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Edit Profile</h1>
        <Link href="/vendor/dashboard" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          Back
        </Link>
      </div>

      {saved && (
        <div className="mb-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md p-3">
          Saved. Profile is currently marked as{" "}
          {profileComplete ? "complete" : "incomplete"}.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Business name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
          />
          {fieldErrors.city && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Services you offer</label>
          <div className="grid grid-cols-2 gap-2">
            {activeServices.map((s) => (
              <label key={s.slug} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={services.includes(s.slug)}
                  onChange={() => toggleService(s.slug)}
                />
                {s.name}
              </label>
            ))}
          </div>
          {fieldErrors.services && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.services}</p>
          )}
          <p className="text-xs text-zinc-500 mt-2">
            Changes to city or services here only affect matching for new requests
            submitted after you save — they don&apos;t retroactively change any
            opportunity or match you already have.
          </p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">About</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
            placeholder="Tell customers about your business..."
          />
          {fieldErrors.about && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.about}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Starting price (INR)</label>
          <input
            type="number"
            min={0}
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
            placeholder="25000"
          />
          {fieldErrors.startingPrice && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.startingPrice}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Service areas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200"
              >
                {area}
                <button
                  type="button"
                  onClick={() => removeServiceArea(area)}
                  className="text-zinc-500 hover:text-zinc-300"
                  aria-label={`Remove ${area}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
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
              className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100"
              placeholder="Add a city or area"
            />
            <button
              type="button"
              onClick={addServiceArea}
              className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm"
            >
              Add
            </button>
          </div>
          {fieldErrors.serviceAreas && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.serviceAreas}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-white text-zinc-900 font-medium py-2 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save profile"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-zinc-800">
        <label className="block text-sm text-zinc-400 mb-2">
          Portfolio ({portfolioItems.length}/{MAX_PORTFOLIO_ITEMS})
        </label>

        {portfolioError && (
          <div className="mb-3 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
            {portfolioError}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          {portfolioItems.map((item) => (
            <div key={item.id} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element -- local disk-served static path, not an optimizable remote image */}
              <img
                src={item.imagePath}
                alt="Portfolio"
                className="w-full h-full object-cover rounded-md border border-zinc-700"
              />
              <button
                type="button"
                onClick={() => handleRemovePortfolioItem(item.id)}
                className="absolute top-1 right-1 bg-zinc-950/80 text-zinc-200 rounded-full w-6 h-6 text-sm leading-none hover:bg-red-950"
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={handleUploadPortfolioItem}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-zinc-100 file:px-3 file:py-2 disabled:opacity-50"
          />
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-800">
        <label className="block text-sm text-zinc-400 mb-2">
          Brochure / Documents ({documents.length}/{MAX_DOCUMENTS})
        </label>
        <p className="text-xs text-zinc-500 mb-3">
          Upload a PDF brochure once and it&apos;s shown on your public profile — customers
          see your existing work instead of you re-typing every detail into each quote.
          Documents containing a phone number or email address are rejected automatically
          so all communication stays through MuggedMoments.
        </p>

        {documentError && (
          <div className="mb-3 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-3">
            {documentError}
          </div>
        )}

        {documents.length > 0 && (
          <ul className="mb-3 space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
              >
                <a
                  href={doc.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-200 truncate underline hover:text-zinc-100"
                >
                  {doc.originalFilename || "Document.pdf"}
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="text-zinc-500 hover:text-red-400 shrink-0"
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
            You&apos;ve reached the maximum of {MAX_DOCUMENTS} documents. Remove one to add another.
          </p>
        ) : (
          <input
            ref={documentInputRef}
            type="file"
            accept="application/pdf"
            disabled={uploadingDocument}
            onChange={handleUploadDocument}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-zinc-100 file:px-3 file:py-2 disabled:opacity-50"
          />
        )}
        {uploadingDocument && (
          <p className="text-xs text-zinc-500 mt-2">Scanning and uploading...</p>
        )}
      </div>
    </div>
  );
}
