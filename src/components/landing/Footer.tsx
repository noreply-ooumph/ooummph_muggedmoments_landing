/**
 * MuggedMoments — Footer Component
 *
 * Brand footer with legal disclaimers and attribution notice.
 */

"use client";

import React from "react";
import { FOOTER_CONTENT } from "@/config/content";

export function Footer() {
  return (
    <footer className="bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 text-zinc-500 py-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset, not an optimizable remote image */}
          <img src="/logo-icon.png" alt="" className="h-7 w-auto shrink-0" />
          <div>
            <p className="font-bold text-zinc-300">MuggedMoments Engine</p>
            <p className="text-[11px] text-zinc-500">
              Deterministic Event Vendor Matching & Lead Automation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <a href="#event-types" className="hover:text-amber-400">
            Event Types
          </a>
          <a href="#how-it-works" className="hover:text-amber-400">
            How It Works
          </a>
          <a href="#faq" className="hover:text-amber-400">
            FAQ
          </a>
          {FOOTER_CONTENT.links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-amber-400">
              {link.label}
            </a>
          ))}
        </div>

        <p className="text-[11px] text-zinc-600">
          © {new Date().getFullYear()} MuggedMoments Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
