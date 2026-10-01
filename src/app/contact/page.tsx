/**
 * MuggedMoments — /contact
 *
 * Deliberately bounded content — see implementation brief. No email address
 * (none supplied — do not invent one), no separate business-enquiry form
 * (out of scope for this brief). WhatsApp link built the same way as
 * /thank-you's — absent entirely, not disabled, when
 * NEXT_PUBLIC_WHATSAPP_NUMBER is unset.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with MuggedMoments.",
};

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function ContactPage() {
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hi MuggedMoments, I have a question."
      )}`
    : null;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-8">
          Contact
        </h1>

        <div className="flex flex-col gap-4">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-5 py-3 transition-colors self-start"
            >
              Chat on WhatsApp
            </a>
          )}

          <a href="/#faq" className="text-zinc-400 hover:text-amber-400 underline text-sm">
            Read the FAQ
          </a>
        </div>
      </main>
    </div>
  );
}
