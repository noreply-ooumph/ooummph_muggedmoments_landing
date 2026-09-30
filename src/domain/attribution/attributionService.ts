/**
 * MuggedMoments — Attribution Domain Service
 *
 * Handles UTM parameter capture, preservation, and storage.
 *
 * Rules:
 * - Capture attribution on landing
 * - Preserve during form interaction
 * - Associate with eventual lead
 * - Do NOT lose attribution during navigation
 * - Do NOT overwrite original attribution accidentally
 * - Preserve raw attribution values
 *
 * IMPORTANT: No first-touch/last-touch policy implemented.
 * Raw attribution data is preserved as captured.
 */

import type { Attribution } from "@/types";

// UTM parameters we capture
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmParam = (typeof UTM_PARAMS)[number];

/**
 * Parses UTM parameters from a URL search string.
 * Unknown parameters are ignored — only approved UTM params are captured.
 * Returns null if no UTM parameters are present.
 */
export function parseAttributionFromUrl(searchString: string): Attribution | null {
  const params = new URLSearchParams(searchString);
  const attribution: Attribution = {};
  let hasAny = false;

  for (const param of UTM_PARAMS) {
    const value = params.get(param);
    if (value && value.trim()) {
      const key = param.replace("utm_", "") as keyof Omit<
        Attribution,
        "landingPath" | "capturedAt"
      >;
      attribution[key] = value.trim().slice(0, 255); // sanitize length
      hasAny = true;
    }
  }

  if (!hasAny) return null;

  attribution.capturedAt = new Date().toISOString();
  return attribution;
}

/**
 * Captures attribution from the current browser URL.
 * Client-side only — do not call on the server.
 */
export function captureAttributionFromWindow(): Attribution | null {
  if (typeof window === "undefined") return null;

  const attribution = parseAttributionFromUrl(window.location.search);
  if (attribution) {
    attribution.landingPath = window.location.pathname + window.location.search;
  }
  return attribution;
}

/**
 * Merges stored attribution with incoming attribution.
 * Original attribution is NOT overwritten if already present.
 * This preserves the first-captured values without implementing
 * a formal first-touch policy.
 */
export function mergeAttribution(
  stored: Attribution | null | undefined,
  incoming: Attribution | null | undefined
): Attribution | null {
  if (!incoming && !stored) return null;
  if (!incoming) return stored ?? null;
  if (!stored) return incoming;

  // Stored values take precedence — do not overwrite original
  return {
    source: stored.source ?? incoming.source,
    medium: stored.medium ?? incoming.medium,
    campaign: stored.campaign ?? incoming.campaign,
    content: stored.content ?? incoming.content,
    term: stored.term ?? incoming.term,
    landingPath: stored.landingPath ?? incoming.landingPath,
    capturedAt: stored.capturedAt ?? incoming.capturedAt,
  };
}

/**
 * Validates that an attribution object does not contain obviously
 * invalid or excessively long values.
 */
export function sanitizeAttribution(
  attribution: Attribution
): Attribution {
  const sanitized: Attribution = {};
  const fields: Array<keyof Attribution> = [
    "source",
    "medium",
    "campaign",
    "content",
    "term",
  ];

  for (const field of fields) {
    const val = attribution[field];
    if (typeof val === "string" && val.trim()) {
      sanitized[field] = val.trim().slice(0, 255);
    }
  }

  if (attribution.landingPath) {
    sanitized.landingPath = attribution.landingPath.slice(0, 2048);
  }
  if (attribution.capturedAt) {
    sanitized.capturedAt = attribution.capturedAt;
  }

  return sanitized;
}
