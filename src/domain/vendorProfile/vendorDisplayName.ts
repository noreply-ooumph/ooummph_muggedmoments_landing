/**
 * MuggedMoments — Vendor Display Name (customer-facing anonymization)
 *
 * Fixes a real disintermediation risk: every customer-facing surface used to
 * show a vendor's real business name (public directory, public profile,
 * matches, quotes) — enough for a customer to Google the exact name, find the
 * vendor's own Instagram/Google Business listing, and contact them directly,
 * bypassing this platform entirely for every future interaction.
 *
 * Deterministic, pure, built only from real vendor data (city + services) —
 * never a fabricated claim, never a generic placeholder like "Vendor #1234"
 * that would make comparison-shopping pointless. No I/O.
 *
 * REVEAL THRESHOLD (a business decision, not an engineering one — flagged
 * explicitly, same CONFIGURATION_REQUIRED convention this codebase already
 * uses for undecided policy elsewhere): the vendor's REAL name is shown to a
 * customer ONLY once a Booking has been confirmed (see publicBookingService.ts's
 * toPublicBooking(), the one mapper that deliberately does NOT call this
 * function) — by that point the customer is about to receive service from
 * this vendor in the real world, so the name is unavoidable and legitimate to
 * reveal. Every earlier surface (public directory/profile, matches, quotes,
 * pending booking requests) uses this anonymized label instead. Revisit this
 * threshold with business before launch if a different point is preferred.
 *
 * contactPhone was ALREADY never exposed to customers anywhere in this
 * codebase (see publicQuoteService.ts / publicVendorProfileService.ts's own
 * header comments) — this closes the remaining gap, the business name.
 */

export function getVendorDisplayName(city: string, serviceNames: string[]): string {
  if (serviceNames.length === 0) return `Vendor — ${city}`;
  if (serviceNames.length === 1) return `${serviceNames[0]} Specialist — ${city}`;
  const topTwo = serviceNames.slice(0, 2).join(" & ");
  return `${topTwo} Team — ${city}`;
}
