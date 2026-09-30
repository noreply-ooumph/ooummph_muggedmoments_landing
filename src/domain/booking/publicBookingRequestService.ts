/**
 * MuggedMoments — Public Booking Request Service (Stage 19, Phase 19.0)
 *
 * Pure mapping from a raw BookingRequest+VendorOpportunity+Vendor+QuoteVersion row
 * to the customer-safe shape. No I/O.
 *
 * vendorName is the ANONYMIZED display label (getVendorDisplayName()), not the
 * real business name — see that function's header comment. Nothing in the
 * current UI renders this field (StatusPageClient sources the displayed name
 * from the quote instead), but the raw JSON response of GET
 * /api/leads/[publicLeadId] includes it regardless — a customer inspecting
 * network responses in devtools would otherwise see the real name here even
 * though the UI never shows it. Anonymize at the data layer, not just the
 * rendering layer.
 */

import { getVendorDisplayName } from "@/domain/vendorProfile/vendorDisplayName";

export type PublicBookingRequestStatus = "REQUESTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface RawBookingRequestRow {
  vendorId: string;
  vendorName: string;
  city: string;
  services: Array<{ service: { name: string } }>;
  status: PublicBookingRequestStatus;
  quoteTotal: number; // calculateTotal() of the referenced QuoteVersion's lineItems, computed by the caller
  rejectionReason: string | null;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface PublicBookingRequest {
  vendorId: string;
  vendorName: string;
  status: PublicBookingRequestStatus;
  quoteTotal: number;
  rejectionReason: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export function toPublicBookingRequest(row: RawBookingRequestRow): PublicBookingRequest {
  return {
    vendorId: row.vendorId,
    vendorName: getVendorDisplayName(row.city, row.services.map((vs) => vs.service.name)),
    status: row.status,
    quoteTotal: row.quoteTotal,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}
