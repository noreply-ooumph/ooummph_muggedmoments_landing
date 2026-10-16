/**
 * MuggedMoments — Standardized Formatting Utilities
 *
 * Provides deterministic, consistent presentation formatting across the application:
 * - City name normalization and casing (BUG-010)
 * - Standardized date/time formats with deterministic timezone behavior (BUG-009)
 */

/**
 * Normalizes city names to title casing and trimmed whitespace.
 * E.g. "mumbai" -> "Mumbai", "NEW DELHI" -> "New Delhi", "bangalore" -> "Bangalore"
 */
export function normalizeCityName(city: string): string {
  if (!city) return "";
  return city
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Safe city display formatter. Returns normalized city or fallback dash.
 */
export function formatCityName(city?: string | null): string {
  if (!city || !city.trim()) return "—";
  return normalizeCityName(city);
}

/**
 * Standardized date and time formatter.
 * Uses en-IN locale with deterministic Indian Standard Time (Asia/Kolkata)
 * to avoid hydration mismatches and inconsistent server locales.
 *
 * Example output: "16 Oct 2026, 03:30 PM"
 */
export function formatStandardDateTime(
  dateInput: string | Date | number | null | undefined
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/**
 * Standardized date-only formatter.
 * Example output: "16 Oct 2026"
 */
export function formatStandardDate(
  dateInput: string | Date | number | null | undefined
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/**
 * Formats preferred representative consultation date and time slot.
 * Example: "16 Oct 2026 at 10:00 AM"
 */
export function formatConsultationSlot(
  dateInput?: string | Date | null,
  timeSlot?: string | null
): string {
  if (!dateInput && !timeSlot) return "—";
  const dateStr = dateInput ? formatStandardDate(dateInput) : "";
  if (dateStr && timeSlot) return `${dateStr} at ${timeSlot}`;
  return dateStr || timeSlot || "—";
}
