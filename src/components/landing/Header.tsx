/**
 * MuggedMoments — Landing Header Component
 *
 * Sticky navigation header with responsive brand identifier, quick links,
 * accessible mobile navigation menu, and action button.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

interface HeaderProps {
  onStartForm: (eventTypeSlug?: string) => void;
}

export function Header({ onStartForm }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0 min-w-0"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset */}
          <img
            src="/logo-icon.png"
            alt="MuggedMoments Logo"
            className="h-7 sm:h-9 w-auto shrink-0"
          />
          <div className="min-w-0">
            <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
              Mugged<span className="text-amber-400">Moments</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Verified Matching
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-medium text-zinc-400">
          <a href="/#event-types" className="hover:text-amber-400 transition-colors">
            Event Types
          </a>
          <a href="/#how-it-works" className="hover:text-amber-400 transition-colors">
            How It Works
          </a>
          <a href="/#reassurance" className="hover:text-amber-400 transition-colors">
            Why Us
          </a>
          <a href="/#faq" className="hover:text-amber-400 transition-colors">
            FAQ
          </a>
          <Link href="/my-requests" className="hover:text-amber-400 transition-colors">
            Check My Status
          </Link>
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            size="sm"
            onClick={() => {
              setMobileMenuOpen(false);
              onStartForm();
            }}
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold text-xs px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-md shadow-amber-400/10 whitespace-nowrap"
          >
            <span className="sm:hidden">Match Now →</span>
            <span className="hidden sm:inline">Match Vendors Now →</span>
          </Button>

          {/* Accessible Mobile Menu Toggle Button */}
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="mobile-nav-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Dropdown Navigation Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-150"
        >
          <nav className="flex flex-col space-y-2 text-sm font-medium text-zinc-300">
            <a
              href="/#event-types"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors"
            >
              Event Types
            </a>
            <a
              href="/#how-it-works"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors"
            >
              How It Works
            </a>
            <a
              href="/#reassurance"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors"
            >
              Why Us
            </a>
            <a
              href="/#faq"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors"
            >
              Frequently Asked Questions
            </a>
            <Link
              href="/my-requests"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors flex items-center justify-between"
            >
              <span>Check My Status</span>
              <span className="text-xs text-amber-400 font-mono">MM-XXXX</span>
            </Link>
            <Link
              href="/vendors"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors"
            >
              Explore Verified Vendors
            </Link>
            <Link
              href="/join-as-vendor"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-amber-400 transition-colors"
            >
              Join as a Vendor
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
