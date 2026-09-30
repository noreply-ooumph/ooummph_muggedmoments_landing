/**
 * MuggedMoments — Landing Header Component
 *
 * Sticky navigation header with brand identifier, quick links, and action button.
 */

"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

interface HeaderProps {
  onStartForm: (eventTypeSlug?: string) => void;
}

export function Header({ onStartForm }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset, not an optimizable remote image */}
          <img src="/logo-icon.png" alt="" className="h-9 w-auto shrink-0" />
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">
              Mugged<span className="text-amber-400">Moments</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Verified Matching
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
          <a href="#event-types" className="hover:text-amber-400 transition-colors">
            Event Types
          </a>
          <a href="#how-it-works" className="hover:text-amber-400 transition-colors">
            How It Works
          </a>
          <a href="#reassurance" className="hover:text-amber-400 transition-colors">
            Why Us
          </a>
          <a href="#faq" className="hover:text-amber-400 transition-colors">
            FAQ
          </a>
          <Link href="/my-requests" className="hover:text-amber-400 transition-colors">
            Check My Status
          </Link>
        </nav>

        {/* Call to Action */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => onStartForm()}
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold text-xs px-4 py-2 rounded-lg shadow-md shadow-amber-400/10"
          >
            Match Vendors Now →
          </Button>
        </div>
      </div>
    </header>
  );
}
