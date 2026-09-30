/**
 * MuggedMoments — Service Catalog Configuration
 *
 * DEVELOPMENT SEED — business must approve final service list.
 */

export interface ServiceConfig {
  slug: string;
  name: string;
  active: boolean;
  order: number;
}

/**
 * DEVELOPMENT SEED ONLY.
 * Business must approve the exact service list before production.
 */
export const SERVICES: ServiceConfig[] = [
  { slug: "after-party", name: "After Party", active: true, order: 1 },
  { slug: "bar", name: "Bar", active: true, order: 2 },
  { slug: "photography", name: "Photography", active: true, order: 3 },
  { slug: "videography", name: "Videography", active: true, order: 4 },
  { slug: "catering", name: "Catering", active: true, order: 5 },
  { slug: "decoration", name: "Decoration", active: true, order: 6 },
  { slug: "venue", name: "Venue", active: true, order: 7 },
  { slug: "music-dj", name: "Music / DJ", active: true, order: 8 },
  { slug: "makeup", name: "Makeup & Hair", active: true, order: 9 },
  { slug: "flowers", name: "Flowers & Floral Design", active: true, order: 10 },
];

export function getActiveServices(): ServiceConfig[] {
  return SERVICES.filter((s) => s.active).sort((a, b) => a.order - b.order);
}

export function findServiceBySlug(slug: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.slug === slug && s.active);
}

export function getValidServiceSlugs(): string[] {
  return SERVICES.filter((s) => s.active).map((s) => s.slug);
}
