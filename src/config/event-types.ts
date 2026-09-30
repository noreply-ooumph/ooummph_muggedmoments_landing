/**
 * MuggedMoments — Event Type Configuration
 *
 * DEVELOPMENT SEED: Wedding, Birthday, Corporate Event
 * These are seeded for development testing only.
 * Business must approve the final event catalog before production.
 */

export interface EventTypeConfig {
  id: string;
  slug: string;
  name: string;
  description: string; // CONTENT_REQUIRES_APPROVAL
  active: boolean;
  order: number;
}

/**
 * DEVELOPMENT SEED ONLY — not production business policy.
 * Update descriptions with business-approved copy before launch.
 */
export const EVENT_TYPES: EventTypeConfig[] = [
  {
    id: "evt-wedding",
    slug: "wedding",
    name: "Wedding",
    description: "[CONTENT_REQUIRES_APPROVAL]",
    active: true,
    order: 1,
  },
  {
    id: "evt-birthday",
    slug: "birthday",
    name: "Birthday",
    description: "[CONTENT_REQUIRES_APPROVAL]",
    active: true,
    order: 2,
  },
  {
    id: "evt-corporate",
    slug: "corporate",
    name: "Corporate Event",
    description: "[CONTENT_REQUIRES_APPROVAL]",
    active: true,
    order: 3,
  },
  {
    id: "evt-other",
    slug: "other",
    name: "Other",
    description: "[CONTENT_REQUIRES_APPROVAL]",
    active: true,
    order: 4,
  },
];

/**
 * Returns the active event type for a given slug.
 * Returns undefined if the slug is unknown or inactive.
 * NEVER converts unknown slugs into valid event types.
 */
export function findEventTypeBySlug(
  slug: string
): EventTypeConfig | undefined {
  return EVENT_TYPES.find((et) => et.slug === slug && et.active);
}

/**
 * Returns all active event types in order.
 */
export function getActiveEventTypes(): EventTypeConfig[] {
  return EVENT_TYPES.filter((et) => et.active).sort(
    (a, b) => a.order - b.order
  );
}

/**
 * Returns valid slugs for validation.
 */
export function getValidEventTypeSlugs(): string[] {
  return EVENT_TYPES.filter((et) => et.active).map((et) => et.slug);
}

/**
 * Builds the human-readable event type label for display. Appends the
 * customer-typed custom name (Lead.customEventTypeName) when present — e.g.
 * "Other — Baby Shower" — since the catalog's own "Other" name alone tells a
 * vendor/admin nothing about what the customer actually meant. Falls back to
 * the plain catalog name for every event type that has no custom name.
 */
export function formatEventTypeDisplay(
  eventTypeName: string,
  customEventTypeName?: string | null
): string {
  return customEventTypeName
    ? `${eventTypeName} — ${customEventTypeName}`
    : eventTypeName;
}
