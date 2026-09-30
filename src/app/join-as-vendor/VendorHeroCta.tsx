/**
 * MuggedMoments — /join-as-vendor hero CTA (client boundary)
 *
 * A server component cannot attach an onClick handler to any element, so this
 * is split out as the minimal client boundary needed for the one tracked CTA
 * on this page — everything else on /join-as-vendor/page.tsx stays a plain
 * server component.
 */

"use client";

import React from "react";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics";

export function VendorHeroCta({ label }: { label: string }) {
  return (
    <Button
      variant="primary"
      size="lg"
      onClick={() => {
        track("vendor_hero_cta_click", { label });
        window.location.href = "/vendor";
      }}
    >
      {label}
    </Button>
  );
}
