/**
 * MuggedMoments — Analytics Abstraction
 *
 * AnalyticsProvider interface allows swapping providers without
 * changing call sites.
 *
 * Development: MockAnalyticsProvider (logs to console, no external calls)
 * Production: Configure with real provider credentials via env vars
 *
 * REQUIRES_EXTERNAL_CREDENTIALS: Real provider integration requires
 * ANALYTICS_WRITE_KEY to be set.
 *
 * Events must not expose unnecessary PII.
 */

import type { AnalyticsEvent, AnalyticsPayload } from "@/types";
import { getOrCreateAnonymousId } from "./anonymousId";

export interface AnalyticsProvider {
  track(payload: AnalyticsPayload): void;
  page(url: string): void;
}

/**
 * MockAnalyticsProvider — used in development and test.
 * Logs events to console only. No external network calls.
 */
export class MockAnalyticsProvider implements AnalyticsProvider {
  track(payload: AnalyticsPayload): void {
    if (process.env.NODE_ENV !== "test") {
      console.log("[ANALYTICS:MOCK] track", JSON.stringify(payload));
    }
  }

  page(url: string): void {
    if (process.env.NODE_ENV !== "test") {
      console.log("[ANALYTICS:MOCK] page", url);
    }
  }
}

/**
 * NoOpAnalyticsProvider — silent provider for tests.
 */
export class NoOpAnalyticsProvider implements AnalyticsProvider {
  track(_payload: AnalyticsPayload): void {}
  page(_url: string): void {}
}

/**
 * PersistedAnalyticsProvider — Stage 14: the first provider that makes events
 * queryable rather than console-only. Fires a fire-and-forget POST to /api/analytics,
 * automatically attaching the browser's anonymous session ID so a later funnel/timeline
 * report can join pre-lead events to the lead they eventually produced. Never throws —
 * same silent/no-throw posture as MockAnalyticsProvider.
 */
export class PersistedAnalyticsProvider implements AnalyticsProvider {
  track(payload: AnalyticsPayload): void {
    if (process.env.NODE_ENV !== "test") {
      console.log("[ANALYTICS]", JSON.stringify(payload));
    }

    if (typeof window === "undefined") return;

    // Call sites (e.g. lead_created) pass the customer-facing public lead ID inside
    // `properties`, not the internal Lead id that AnalyticsEvent.leadId stores (same ID
    // space as AuditLog.entityId) — the server resolves public -> internal below, so no
    // call site needs to know about that distinction.
    const publicLeadId =
      typeof payload.properties?.publicLeadId === "string"
        ? payload.properties.publicLeadId
        : undefined;

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: payload.event,
        properties: payload.properties,
        anonymousId: getOrCreateAnonymousId(),
        publicLeadId,
      }),
    }).catch(() => {
      // Analytics delivery must never break the calling UI flow.
    });
  }

  page(url: string): void {
    this.track({ event: "page_view", properties: { url } });
  }
}

// ============================================================
// Factory — resolves the correct provider from environment
// ============================================================

function createAnalyticsProvider(): AnalyticsProvider {
  const provider = process.env.ANALYTICS_PROVIDER ?? "mock";

  if (provider === "mock" || process.env.NODE_ENV === "development") {
    return new PersistedAnalyticsProvider();
  }

  // REQUIRES_EXTERNAL_CREDENTIALS — real provider not yet configured
  // When credentials exist, replace this with real provider initialization
  console.warn(
    "[ANALYTICS] Provider configured as non-mock but no real provider is implemented. " +
      "Falling back to PersistedAnalyticsProvider. " +
      "REQUIRES_EXTERNAL_CREDENTIALS to implement real provider."
  );
  return new PersistedAnalyticsProvider();
}

export const analytics: AnalyticsProvider = createAnalyticsProvider();

// ============================================================
// Typed helper for tracking events
// ============================================================

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
): void {
  analytics.track({ event, properties });
}
