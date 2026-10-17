import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageViewTracker } from "./PageViewTracker";
import { BackgroundVideo } from "@/components/public/BackgroundVideo";
import { SITE_CONFIG } from "@/config/content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  title: {
    default: "MuggedMoments",
    template: "%s | MuggedMoments",
  },
  description: SITE_CONFIG.seo.description,
};

// Minimal, honest structured data only — Organization/WebSite, using facts
// already true in this codebase (site name, site URL). Uses production canonical URL
// to ensure schema validators never encounter localhost (BUG-001).
function getCanonicalStructuredDataUrl(): string {
  if (SITE_CONFIG.siteUrl && !SITE_CONFIG.siteUrl.includes("localhost")) {
    return SITE_CONFIG.siteUrl;
  }
  return "https://ooummphmuggedmomentslanding.vercel.app";
}

function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.siteName,
    url: getCanonicalStructuredDataUrl(),
  };
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.siteName,
    url: getCanonicalStructuredDataUrl(),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
        {/* Global Fixed Background Video Across Entire App */}
        <BackgroundVideo />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        <PageViewTracker />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
