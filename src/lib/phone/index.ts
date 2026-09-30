/**
 * MuggedMoments — Shared Phone Normalization
 *
 * Extracted from leadService.ts's private normalizePhoneLast10() (originally
 * built for getLeadSummariesByPhone()'s "check my status" lookup) so vendor
 * login/registration can use the exact same rule — see PATCH history for the
 * reasoning: contactPhone/phone fields are stored exactly as typed, with no
 * normalization at write time, so the same person can plausibly type
 * "+91 98765 43210" once and "9876543210" another time. Comparing raw strings
 * would silently treat those as different people/vendors.
 */

/**
 * Normalizes a phone number to its last-10-digit shape for matching — strips
 * everything but digits, then keeps the last 10.
 */
export function normalizePhoneLast10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
