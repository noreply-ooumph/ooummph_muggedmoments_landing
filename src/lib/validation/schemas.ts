/**
 * MuggedMoments — Shared Zod Validation Schemas
 *
 * These schemas are the single source of truth for validation.
 * Used by both the frontend and backend to ensure alignment.
 *
 * Client-side: used for UX validation
 * Server-side: authoritative validation — server always re-validates
 */

import { z } from "zod";
import { getValidEventTypeSlugs } from "@/config/event-types";
import { getValidServiceSlugs } from "@/config/services";
import { ANALYTICS_EVENTS } from "@/types";

// ============================================================
// ATTRIBUTION SCHEMA
// ============================================================

export const AttributionSchema = z.object({
  source: z.string().max(255).optional(),
  medium: z.string().max(255).optional(),
  campaign: z.string().max(255).optional(),
  content: z.string().max(255).optional(),
  term: z.string().max(255).optional(),
  landingPath: z.string().max(2048).optional(),
  capturedAt: z.string().optional(),
});

// ============================================================
// CREATE LEAD SCHEMA
// ============================================================

// Plain object schema (no cross-field refine) so Step1-6/ResumeLeadSchema below
// can still use .pick() — Zod's .pick() requires a ZodObject, not the ZodEffects
// wrapper a top-level .refine()/.superRefine() would produce. The cross-field
// "customEventTypeName required when eventTypeSlug is 'other'" rule is layered
// on separately for CreateLeadSchema and Step1Schema (the only two places that
// actually need to enforce it) rather than on this shared base.
const CreateLeadObjectSchema = z.object({
  idempotencyKey: z
    .string()
    .uuid("Idempotency key must be a valid UUID.")
    .min(1, "Idempotency key is required."),

  eventTypeSlug: z
    .string()
    .min(1, "Please select an event type.")
    .refine(
      (slug) => getValidEventTypeSlugs().includes(slug),
      "Please select a valid event type."
    ),

  // Customer-typed event name, only meaningful (and only required) when
  // eventTypeSlug === "other" — the fixed EventType catalog has no row that
  // can describe an arbitrary custom event, so this carries what the customer
  // actually typed. Ignored/optional for every other event type.
  customEventTypeName: z
    .string()
    .min(1, "Please tell us what kind of event this is.")
    .max(255, "Event name is too long.")
    .optional(),

  city: z
    .string()
    .min(1, "Please enter your city.")
    .max(255, "City name is too long."),

  // Optional locality/area within the city — informational only, not a
  // matching dimension (see Lead.locality's schema comment).
  locality: z.string().max(255, "Locality name is too long.").optional(),

  eventDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date > new Date();
      },
      "Please select a valid future event date."
    ),

  guestCount: z
    .number()
    .int("Guest count must be a whole number.")
    .min(1, "Guest count must be at least 1.")
    .max(100000, "Enter a valid number of guests.")
    .optional(),

  budget: z.string().max(100).optional(),
  // CONFIGURATION_REQUIRED: Validate against approved budget tiers when defined

  services: z
    .array(z.string())
    .min(1, "Please select at least one service.")
    .refine(
      (services) =>
        services.every((s) => getValidServiceSlugs().includes(s)),
      "One or more selected services are invalid."
    ),

  customerName: z
    .string()
    .min(1, "Please enter your name.")
    .max(255, "Name is too long."),

  phone: z
    .string()
    .min(7, "Enter a valid phone number.")
    .max(20, "Enter a valid phone number.")
    .regex(
      /^\+?[0-9\s\-().]{7,20}$/,
      "Enter a valid phone number."
    ),

  whatsappConsent: z.boolean({
    message: "WhatsApp consent field is required.",
  }),

  attribution: AttributionSchema.optional(),

  // Per-question validation happens server-side against the live Question catalog
  // (see domain/dynamicQuestions/dynamicQuestionsService.ts) — this only accepts the shape.
  dynamicAnswers: z.record(z.string(), z.any()).optional(),
});

// Cross-field rule: a customer who picked "Other" must have typed something,
// since the EventType catalog has no row describing what they meant. Every
// other event type ignores customEventTypeName entirely.
const requireCustomEventTypeNameWhenOther = (
  data: { eventTypeSlug: string; customEventTypeName?: string },
  ctx: z.RefinementCtx
) => {
  if (data.eventTypeSlug === "other" && !data.customEventTypeName?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["customEventTypeName"],
      message: "Please tell us what kind of event this is.",
    });
  }
};

export const CreateLeadSchema = CreateLeadObjectSchema.superRefine(
  requireCustomEventTypeNameWhenOther
);

export type CreateLeadInput = z.infer<typeof CreateLeadObjectSchema>;

// ============================================================
// FORM STEP SCHEMAS (partial schemas for step-by-step validation)
// ============================================================

export const Step1Schema = CreateLeadObjectSchema.pick({
  eventTypeSlug: true,
  customEventTypeName: true,
}).superRefine(requireCustomEventTypeNameWhenOther);

export const Step2Schema = CreateLeadObjectSchema.pick({ city: true, locality: true });

export const Step3Schema = CreateLeadObjectSchema.pick({ eventDate: true });

export const Step4Schema = CreateLeadObjectSchema.pick({
  guestCount: true,
  budget: true,
});

export const Step5Schema = CreateLeadObjectSchema.pick({ services: true });

export const Step6Schema = CreateLeadObjectSchema.pick({
  customerName: true,
  phone: true,
  whatsappConsent: true,
});

export const StepSchemas = [
  Step1Schema,
  Step2Schema,
  Step3Schema,
  Step4Schema,
  Step5Schema,
  Step6Schema,
] as const;

// ============================================================
// IDEMPOTENCY KEY VALIDATION
// ============================================================

export const IdempotencyKeySchema = z
  .string()
  .uuid("Invalid idempotency key.");

// ============================================================
// PUBLIC LEAD ID FORMAT
// ============================================================

export const PublicLeadIdSchema = z
  .string()
  .regex(/^MM-[A-Z0-9]{8}$/, "Invalid lead ID format.");

// ============================================================
// RESUME INCOMPLETE LEAD (Stage 9) — partial patch of core fields only
// ============================================================

export const ResumeLeadSchema = CreateLeadObjectSchema.pick({
  eventDate: true,
  guestCount: true,
  budget: true,
  services: true,
  locality: true,
}).partial();

// ============================================================
// COMMUNICATION PREFERENCES — independent of ResumeLeadSchema's missing-fields gate
// ============================================================

export const CommunicationPreferencesSchema = z
  .object({
    emailOptIn: z.boolean().optional(),
    smsOptIn: z.boolean().optional(),
  })
  .partial();

// Combined PATCH /api/leads/[publicLeadId] body — resume fields (gated by
// missingFields server-side) and preferences (always freely updatable) together,
// since the work order requires one shared PATCH handler rather than two routes.
export const LeadPatchSchema = ResumeLeadSchema.merge(
  CommunicationPreferencesSchema
);

// ============================================================
// ANALYTICS EVENT (Stage 14) — validated against the shared event-name list
// ============================================================

export const AnalyticsEventBodySchema = z.object({
  event: z.enum(ANALYTICS_EVENTS),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  anonymousId: z.string().optional(),
  leadId: z.string().optional(),
  // Customer-facing public ID (MM-XXXXXXXX) — the route resolves this to the internal
  // leadId server-side, since the client never knows the internal Lead id.
  publicLeadId: z.string().optional(),
});

// ============================================================
// SHARED PHONE FIELD — reused across vendor auth and the customer status lookup
// ============================================================

// Reuses the exact same phone regex as CreateLeadSchema.phone for consistency.
// Named neutrally (not vendor-specific) since it's now also used by
// LeadPhoneLookupSchema below.
const phoneField = z
  .string()
  .min(7, "Enter a valid phone number.")
  .max(20, "Enter a valid phone number.")
  .regex(/^\+?[0-9\s\-().]{7,20}$/, "Enter a valid phone number.");

// ============================================================
// CUSTOMER STATUS LOOKUP (Stage 20) — phone-only, no verification, an explicit,
// informed product decision. See docs/customer-status-lookup-brief.md.
// ============================================================

export const LeadPhoneLookupSchema = z.object({
  phone: phoneField,
});

// ============================================================
// VENDOR AUTHENTICATION (Stage 16, Phase 0) — phone + OTP, no password
// ============================================================

// Vendor auth is phone-number-only (no OTP) — see src/app/api/vendor/login/route.ts.
export const VendorLoginSchema = z.object({
  phone: phoneField,
});

export const VendorRegisterSchema = z.object({
  phone: phoneField,
  name: z
    .string()
    .min(1, "Please enter a business name.")
    .max(255, "Business name is too long."),
  city: z
    .string()
    .min(1, "Please enter your city.")
    .max(255, "City name is too long."),
  services: z
    .array(z.string())
    .min(1, "Please select at least one service.")
    .refine(
      (services) => services.every((s) => getValidServiceSlugs().includes(s)),
      "One or more selected services are invalid."
    ),
  attribution: AttributionSchema.optional(),
});

// ============================================================
// VENDOR PROFILE PATCH (Stage 16, Phase 1) — partial, all fields optional
//
// name/city/services added later (same validation rules as VendorRegisterSchema
// — these were previously only settable at registration, with no edit path
// afterward; see updateVendorProfile's usage in PATCH /api/vendor/profile for
// the reasoning on why that was a real gap for city/services specifically,
// since both are matching dimensions).
// ============================================================

export const VendorProfilePatchSchema = z.object({
  name: z
    .string()
    .min(1, "Please enter a business name.")
    .max(255, "Business name is too long.")
    .optional(),
  city: z
    .string()
    .min(1, "Please enter your city.")
    .max(255, "City name is too long.")
    .optional(),
  services: z
    .array(z.string())
    .min(1, "Please select at least one service.")
    .refine(
      (services) => services.every((s) => getValidServiceSlugs().includes(s)),
      "One or more selected services are invalid."
    )
    .optional(),
  about: z.string().max(2000, "About section is too long.").optional(),
  startingPrice: z
    .number()
    .int("Starting price must be a whole number.")
    .min(0, "Starting price cannot be negative.")
    .max(100000000, "Enter a valid starting price.")
    .optional(),
  serviceAreas: z
    .array(z.string().min(1).max(255))
    .max(50, "Too many service areas.")
    .optional(),
});

// ============================================================
// VENDOR OPPORTUNITY RESPOND (Stage 18, Phase 18.0)
// ============================================================

export const OpportunityRespondSchema = z.object({
  action: z.enum(["INTERESTED", "DECLINED"]),
});

// ============================================================
// VENDOR SELF-SERVICE AVAILABILITY — see availabilityService.ts's
// setVendorAvailability(). Only AVAILABLE/UNAVAILABLE are settable this way —
// UNKNOWN means "no data," which a vendor clears a date to rather than sets.
// ============================================================

export const VendorAvailabilityPatchSchema = z.object({
  date: z
    .string()
    .min(1, "Please select a date.")
    .refine((val) => !isNaN(new Date(val).getTime()), "Please enter a valid date."),
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
});

export const VendorAvailabilityDeleteSchema = z.object({
  date: z
    .string()
    .min(1, "Please select a date.")
    .refine((val) => !isNaN(new Date(val).getTime()), "Please enter a valid date."),
});

// ============================================================
// ADMIN — VENDOR VERIFICATION PATCH
// ============================================================

export const VendorVerificationPatchSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
});

// ============================================================
// ADMIN — LEAD DETAIL CORRECTION (Basic-Auth-gated internal ops only)
// ============================================================

// Deliberately its own schema, not a reuse/pick of CreateLeadSchema: that
// schema's eventDate rule requires a future date (correct for a customer
// submitting a new request), but an admin correction may legitimately need to
// set a past date (fixing a typo on an already-elapsed event). Every other
// field's validation rule is otherwise identical to CreateLeadSchema's, since
// the underlying data shape hasn't changed — see updateLeadDetailsForAdmin()
// in leadService.ts for which fields this covers and why.
export const AdminLeadPatchSchema = z.object({
  customerName: z
    .string()
    .min(1, "Please enter a name.")
    .max(255, "Name is too long.")
    .optional(),
  phone: z
    .string()
    .min(7, "Enter a valid phone number.")
    .max(20, "Enter a valid phone number.")
    .regex(/^\+?[0-9\s\-().]{7,20}$/, "Enter a valid phone number.")
    .optional(),
  city: z
    .string()
    .min(1, "Please enter a city.")
    .max(255, "City name is too long.")
    .optional(),
  locality: z.string().max(255, "Locality name is too long.").optional(),
  eventDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), "Please enter a valid date."),
  guestCount: z
    .number()
    .int("Guest count must be a whole number.")
    .min(1, "Guest count must be at least 1.")
    .max(100000, "Enter a valid number of guests.")
    .optional(),
  budget: z.string().max(100).optional(),
  services: z
    .array(z.string())
    .min(1, "Please select at least one service.")
    .refine(
      (services) => services.every((s) => getValidServiceSlugs().includes(s)),
      "One or more selected services are invalid."
    )
    .optional(),
});

// ============================================================
// QUOTE DRAFT PATCH (Stage 18, Phase 18.1) — partial, all fields optional
// ============================================================

export const QuoteDraftPatchSchema = z.object({
  lineItems: z
    .array(
      z.object({
        label: z.string().min(1).max(255),
        amount: z.number().int().min(0),
      })
    )
    .max(50)
    .optional(),
  availabilityState: z
    .enum(["AVAILABLE", "PENDING_CONFIRMATION", "UNAVAILABLE", "UNKNOWN"])
    .optional(),
  validUntil: z.string().optional(),
  notes: z.string().max(2000).optional(),
  included: z.array(z.string().min(1).max(255)).max(20).optional(),
  excluded: z.array(z.string().min(1).max(255)).max(20).optional(),
});

// ============================================================
// QUOTE MESSAGE (Stage 18, Phase 18.5)
// ============================================================

export const QuoteMessageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
});

// ============================================================
// BOOKING REQUEST (Stage 19, Phase 19.0)
// ============================================================

export const CreateBookingRequestSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  expectedVersionNumber: z.number().int().min(1),
});

// ============================================================
// REJECT BOOKING REQUEST (Stage 19, Phase 19.1)
// ============================================================

export const RejectBookingRequestSchema = z
  .object({
    reason: z.enum(["DATE_NO_LONGER_AVAILABLE", "BUDGET_MISMATCH", "OUTSIDE_SERVICE_AREA", "OTHER"]),
    note: z.string().max(500).optional(),
  })
  .refine((data) => data.reason !== "OTHER" || Boolean(data.note?.trim()), {
    message: "Please provide a note for 'Other'.",
    path: ["note"],
  });

// ============================================================
// CANCEL BOOKING (Stage 19, Phase 19.5)
// ============================================================

export const CancelBookingSchema = z.object({
  note: z.string().max(500).optional(),
});
