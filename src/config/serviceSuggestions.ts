/**
 * MuggedMoments — Service Suggestion Config (customer-facing form nudge)
 *
 * DEVELOPMENT SEED / CONTENT_REQUIRES_APPROVAL — same convention as
 * event-types.ts's EVENT_TYPES: these pairings are a reasonable placeholder,
 * not a business-approved or data-derived claim. Business must approve the
 * real curated list (or replace it with a live-computed one) before launch.
 *
 * Deliberately NOT framed to customers as a popularity/statistics claim
 * ("most customers pick this," "68% also book X") — this app makes no
 * unverified claims anywhere else (see MatchList.tsx / publicMatchService.ts's
 * same discipline for vendor matches), and with only a handful of dev-seed
 * leads today, any such stat would be fabricated. The UI using this config
 * must phrase it as a neutral suggestion only ("you might also want"),
 * something that's true regardless of any real data. Once real submission
 * volume exists, this static list could be replaced by a genuine live
 * co-occurrence stat (a groupBy on Lead.services) — but not before there's
 * enough real data for that to be honest.
 */

export const SERVICE_SUGGESTIONS: Record<string, string[]> = {
  wedding: ["venue", "catering", "decoration", "photography"],
  birthday: ["catering", "decoration", "music-dj"],
  corporate: ["catering", "venue", "photography"],
};

/**
 * Returns suggested service slugs for an event type, excluding whatever the
 * customer has already selected. Returns [] for an unconfigured/unknown event
 * type — never guesses.
 */
export function getServiceSuggestions(
  eventTypeSlug: string | undefined,
  alreadySelected: string[]
): string[] {
  if (!eventTypeSlug) return [];
  const suggested = SERVICE_SUGGESTIONS[eventTypeSlug] ?? [];
  return suggested.filter((slug) => !alreadySelected.includes(slug));
}
