/**
 * MuggedMoments — Attribution Hook (Client-side)
 *
 * Captures UTM parameters from the URL on first render.
 * Persists attribution in sessionStorage to survive navigation.
 * Never overwrites original attribution values.
 */

"use client";

import { useState, useEffect } from "react";
import type { Attribution } from "@/types";
import {
  captureAttributionFromWindow,
  mergeAttribution,
} from "@/domain/attribution/attributionService";

const ATTRIBUTION_KEY = "mm_attribution";

function loadStoredAttribution(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Attribution;
  } catch {
    return null;
  }
}

function saveAttribution(attribution: Attribution): void {
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage unavailable — continue without persistence
  }
}

export function useAttribution(): Attribution | null {
  const [attribution, setAttribution] = useState<Attribution | null>(null);

  useEffect(() => {
    const fromUrl = captureAttributionFromWindow();
    const stored = loadStoredAttribution();
    const merged = mergeAttribution(stored, fromUrl);

    if (merged) {
      saveAttribution(merged);
      setAttribution(merged);
    } else if (stored) {
      setAttribution(stored);
    }
  }, []);

  return attribution;
}
