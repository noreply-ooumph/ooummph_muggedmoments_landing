/**
 * MuggedMoments — Lead Service (Main Orchestrator)
 *
 * Orchestrates the full lead creation pipeline:
 *
 * 1. Validate input (event type, services, consent, idempotency)
 * 2. Idempotency check (reject duplicate requests gracefully)
 * 3. Transactional lead creation:
 *    - Create Lead
 *    - Create LeadAttribution
 *    - Create initial LeadEvent
 *    - Create AuditLog
 * 4. Run automation pipeline:
 *    - Completeness evaluation
 *    - Scoring
 *    - Matching
 *    - Availability filtering
 * 5. Return authoritative state
 *
 * Each step is independently testable.
 * Failures in automation do not roll back lead creation.
 * Half-created leads are prevented by transactions.
 */

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import {
  generatePublicLeadId,
} from "@/lib/idempotency";
import { logger } from "@/lib/logger";
import {
  ValidationError,
  DuplicateSubmissionError,
  AppError,
  NotFoundError,
} from "@/lib/errors";
import { findEventTypeBySlug, formatEventTypeDisplay } from "@/config/event-types";
import { findServiceBySlug } from "@/config/services";
import { sanitizeAttribution } from "@/domain/attribution/attributionService";
import { evaluateCompleteness } from "@/domain/completeness/completenessService";
import { calculateScore } from "@/domain/scoring/scoringService";
import { runMatching, evaluateCompatibility } from "@/domain/matching/matchingService";
import { checkVendorAvailability, refreshMatchAvailability } from "@/domain/availability/availabilityService";
import { getResponseDeadline, indicatesInterest } from "@/domain/opportunity/opportunityService";
import { createAuditLog } from "@/domain/audit/auditService";
import {
  deriveNextStatus,
  beginResume,
} from "@/domain/qualification/qualificationService";
import type { QualificationStatus } from "@prisma/client";
import { getActiveQuestionsForEventType } from "@/domain/dynamicQuestions/dynamicQuestionsService";
import {
  filterVisibleQuestions,
  buildDynamicQuestionSchema,
} from "@/domain/dynamicQuestions/dynamicQuestionRules";
import { runAutomation } from "@/services/automation/automationService";
import { whatsApp } from "@/lib/whatsapp";
import { toPublicMatches } from "@/domain/matching/publicMatchService";
import { toPublicQuote, type PublicQuote } from "@/domain/quote/publicQuoteService";
import { getCurrentVersion } from "@/domain/quote/quoteVersionService";
import { calculateTotal } from "@/domain/quote/quoteService";
import { toPublicBookingRequest, type PublicBookingRequest } from "@/domain/booking/publicBookingRequestService";
import { toPublicBooking, type PublicBooking } from "@/domain/booking/publicBookingService";
import { isBookingRequestExpired } from "@/domain/booking/bookingRequestService";
import { normalizePhoneLast10 } from "@/lib/phone";
import type {
  CreateLeadInput,
  LeadResponse,
  CompletenessStatus,
  PublicVendorMatch,
} from "@/types";

/**
 * Attempts to find an existing lead by idempotency key.
 * If found, reconstructs the LeadResponse from the stored data.
 * This ensures idempotent behavior on retry.
 */
async function findExistingLeadByIdempotencyKey(
  idempotencyKey: string
): Promise<LeadResponse | null> {
  const existing = await prisma.lead.findUnique({
    where: { idempotencyKey },
    include: {
      leadScore: true,
      attribution: true,
      qualification: true,
      matches: {
        include: {
          vendor: {
            include: { services: { include: { service: true } } },
          },
        },
      },
    },
  });

  if (!existing) return null;

  logger.info("Duplicate submission detected — returning existing lead", {
    operation: "findExistingLeadByIdempotencyKey",
    publicLeadId: existing.publicLeadId,
  });

  // Same reasoning as getLeadByPublicId() below: an idempotency retry can land well
  // after the original submission, so a vendor may genuinely have responded by
  // then — this must reflect real state, not just default to false.
  const existingOpportunityRows = await prisma.vendorOpportunity.findMany({
    where: { leadId: existing.id },
    select: { vendorId: true, status: true },
  });
  const existingOpportunityStatusByVendorId = new Map(
    existingOpportunityRows.map((o) => [o.vendorId, o.status])
  );

  // Same reasoning as getLeadByPublicId() below — live, not frozen.
  const existingLiveAvailabilityByVendorId = await refreshMatchAvailability(
    existing.matches.map((m) => m.vendorId),
    existing.eventDate
  );

  return {
    leadId: existing.id,
    publicLeadId: existing.publicLeadId,
    status: existing.status as "SUBMITTED" | "UNDER_REVIEW" | "MATCHED" | "CLOSED" | "INVALID",
    completenessStatus: existing.completenessStatus as CompletenessStatus,
    missingFields: existing.qualification?.missingFields ?? [],
    score: existing.score ?? 0,
    matchedRules: existing.leadScore
      ? (existing.leadScore.matchedRules as Array<{
          ruleId: string;
          weight: number;
          reason: string;
        }>)
      : [],
    scoreVersion: existing.leadScore?.scoreVersion ?? "1.0.0",
    nextAction: "AWAITING_REVIEW",
    qualificationStatus: existing.qualification?.status ?? "CAPTURED",
    matches: toPublicMatches(
      existing.matches.map((match) => ({
        ...match,
        availability:
          existingLiveAvailabilityByVendorId.get(match.vendorId) ?? match.availability,
        vendorInterested: indicatesInterest(
          existingOpportunityStatusByVendorId.get(match.vendorId) ?? "CREATED"
        ),
      }))
    ),
  };
}

/**
 * Persists a qualification-status transition and logs it. Read-modify-write against
 * the current stored status (not a cached in-memory value) so this is safe to call at
 * multiple points in the pipeline without assuming what the row currently holds.
 */
async function transitionQualification(
  leadId: string,
  input: {
    completenessStatus?: CompletenessStatus;
    eligibleMatchCount?: number;
    missingFields?: string[];
  }
): Promise<void> {
  const current = await prisma.leadQualification.findUnique({
    where: { leadId },
  });
  if (!current) return; // created in the same transaction as the Lead — should always exist

  const next = deriveNextStatus(current.status, input);
  const missingFieldsChanged =
    input.missingFields !== undefined &&
    JSON.stringify(input.missingFields) !== JSON.stringify(current.missingFields);

  if (next === current.status && !missingFieldsChanged) return;

  await prisma.leadQualification.update({
    where: { leadId },
    data: {
      status: next,
      ...(input.missingFields !== undefined
        ? { missingFields: input.missingFields }
        : {}),
    },
  });

  if (next !== current.status) {
    await createAuditLog({
      entityType: "Lead",
      entityId: leadId,
      action: "QUALIFICATION_STATUS_CHANGED",
      metadata: { from: current.status, to: next },
    });
  }
}

/**
 * Main lead creation function.
 *
 * Validates → Idempotency Check → Transaction → Automation Pipeline → Response
 */
export async function createLead(
  input: CreateLeadInput
): Promise<LeadResponse> {
  const startTime = Date.now();

  // ============================================================
  // STEP 1: Validate event type against catalog
  // Never trust the input slug directly
  // ============================================================

  const eventType = findEventTypeBySlug(input.eventTypeSlug);
  if (!eventType) {
    throw new ValidationError(
      "Please select a valid event type.",
      { eventTypeSlug: "Please select a valid event type." }
    );
  }

  // ============================================================
  // STEP 2: Validate services against catalog
  // ============================================================

  const invalidServices = input.services.filter(
    (slug) => !findServiceBySlug(slug)
  );
  if (invalidServices.length > 0) {
    throw new ValidationError(
      "One or more selected services are not valid.",
      { services: "Please select valid services." }
    );
  }

  // ============================================================
  // STEP 3: Idempotency check
  // ============================================================

  const existingResponse = await findExistingLeadByIdempotencyKey(
    input.idempotencyKey
  );
  if (existingResponse) {
    // Return the original result — not a duplicate error
    return existingResponse;
  }

  // ============================================================
  // STEP 4: Fetch EventType database record
  // Config slug is validated — now get the DB record ID
  // ============================================================

  const eventTypeRecord = await prisma.eventType.findUnique({
    where: { slug: input.eventTypeSlug },
  });

  if (!eventTypeRecord) {
    // Config and DB are out of sync — this is a configuration issue
    throw new AppError(
      "INTERNAL_ERROR",
      "Event type configuration error. Please contact support.",
      undefined,
      500
    );
  }

  // ============================================================
  // STEP 4b: Validate dynamic answers against the live Question catalog
  // Server always re-validates — the client-side dynamic step is UX only.
  // Questions are additive/informational: they do not affect completeness,
  // scoring, or matching (out of scope for this change).
  // ============================================================

  const activeQuestions = await getActiveQuestionsForEventType(
    eventTypeRecord.id
  );
  const visibleQuestions = filterVisibleQuestions(activeQuestions, {
    eventTypeSlug: input.eventTypeSlug,
    city: input.city,
    guestCount: input.guestCount,
    budget: input.budget,
    services: input.services,
  });

  if (visibleQuestions.length > 0) {
    const dynamicSchema = buildDynamicQuestionSchema(visibleQuestions);
    const dynamicParseResult = dynamicSchema.safeParse(
      input.dynamicAnswers ?? {}
    );

    if (!dynamicParseResult.success) {
      const fields: Record<string, string> = {};
      for (const issue of dynamicParseResult.error.issues) {
        const field = issue.path.join(".");
        if (field && !fields[field]) {
          fields[field] = issue.message;
        }
      }
      throw new ValidationError(
        "Please correct the highlighted fields.",
        fields
      );
    }
  }

  // ============================================================
  // STEP 5: Generate public lead ID (retry on collision)
  // ============================================================

  let publicLeadId = generatePublicLeadId();
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (attempts < MAX_ATTEMPTS) {
    const collision = await prisma.lead.findUnique({
      where: { publicLeadId },
    });
    if (!collision) break;
    publicLeadId = generatePublicLeadId();
    attempts++;
  }

  if (attempts >= MAX_ATTEMPTS) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Failed to generate a unique lead ID. Please try again.",
      undefined,
      500
    );
  }

  // ============================================================
  // STEP 6: Transactional lead creation
  // BEGIN → Lead + Attribution + Event + AuditLog → COMMIT
  // On failure: ROLLBACK (no half-created leads)
  // ============================================================

  const sanitizedAttribution = input.attribution
    ? sanitizeAttribution(input.attribution)
    : null;

  const eventDate = input.eventDate ? new Date(input.eventDate) : null;

  let lead: { id: string; publicLeadId: string };

  try {
    lead = await prisma.$transaction(async (tx: any) => {
      const newLead = await tx.lead.create({
        data: {
          publicLeadId,
          idempotencyKey: input.idempotencyKey,
          eventTypeId: eventTypeRecord.id,
          customEventTypeName:
            input.eventTypeSlug === "other"
              ? input.customEventTypeName?.trim() || null
              : null,
          city: input.city.trim(),
          locality: input.locality?.trim() || null,
          eventDate,
          guestCount: input.guestCount ?? null,
          budget: input.budget ?? null,
          services: input.services,
          customerName: input.customerName.trim(),
          phone: input.phone.trim(),
          whatsappConsent: input.whatsappConsent,
          dynamicAnswers: (input.dynamicAnswers ?? {}) as Prisma.InputJsonValue,
          status: "SUBMITTED",
          completenessStatus: "PENDING",
        },
      });

      // Create attribution if present
      if (sanitizedAttribution) {
        await tx.leadAttribution.create({
          data: {
            leadId: newLead.id,
            utmSource: sanitizedAttribution.source ?? null,
            utmMedium: sanitizedAttribution.medium ?? null,
            utmCampaign: sanitizedAttribution.campaign ?? null,
            utmContent: sanitizedAttribution.content ?? null,
            utmTerm: sanitizedAttribution.term ?? null,
            landingPath: sanitizedAttribution.landingPath ?? null,
          },
        });
      }

      // Create initial lifecycle event
      await tx.leadEvent.create({
        data: {
          leadId: newLead.id,
          eventType: "LEAD_CREATED",
          metadata: {
            publicLeadId,
            city: newLead.city,
            eventTypeSlug: input.eventTypeSlug,
          },
        },
      });

      // Stage 9: qualification tracking starts the moment a lead is captured
      await tx.leadQualification.create({
        data: {
          leadId: newLead.id,
          status: "CAPTURED",
          missingFields: [],
        },
      });

      return { id: newLead.id, publicLeadId: newLead.publicLeadId };
    });
  } catch (error) {
    logger.error("Lead creation transaction failed", {
      operation: "createLead",
      errorCode: "DATABASE_ERROR",
    });
    throw new AppError(
      "DATABASE_ERROR",
      "We were unable to save your request. Please try again.",
      undefined,
      500
    );
  }

  // ============================================================
  // Audit: Lead Created
  // ============================================================

  await createAuditLog({
    entityType: "Lead",
    entityId: lead.id,
    action: "LEAD_CREATED",
    actorType: "API",
    metadata: { publicLeadId: lead.publicLeadId, city: input.city },
  });

  if (sanitizedAttribution) {
    await createAuditLog({
      entityType: "Lead",
      entityId: lead.id,
      action: "ATTRIBUTION_CAPTURED",
      metadata: {
        source: sanitizedAttribution.source,
        medium: sanitizedAttribution.medium,
        campaign: sanitizedAttribution.campaign,
      },
    });
  }

  logger.info("Lead created", {
    operation: "createLead",
    leadId: lead.id,
    publicLeadId: lead.publicLeadId,
    durationMs: Date.now() - startTime,
  });

  // ============================================================
  // STEP 7: Automation Pipeline
  // Completeness → Scoring → Matching → Availability
  // Automation failures do not break lead creation
  // ============================================================

  // --- Automation 1: Completeness ---

  let completenessResult = {
    status: "PENDING" as CompletenessStatus,
    missingFields: [] as string[],
  };

  const completenessRun = await runAutomation(
    { leadId: lead.id, automationType: "COMPLETENESS" },
    async () => {
      const result = evaluateCompleteness({
        eventTypeId: eventTypeRecord.id,
        city: input.city,
        eventDate: eventDate,
        guestCount: input.guestCount,
        budget: input.budget,
        services: input.services,
        customerName: input.customerName,
        phone: input.phone,
        whatsappConsent: input.whatsappConsent,
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { completenessStatus: result.status },
      });

      await createAuditLog({
        entityType: "Lead",
        entityId: lead.id,
        action: "COMPLETENESS_CALCULATED",
        metadata: {
          status: result.status,
          missingFields: result.missingFields,
        },
      });

      return result;
    }
  );

  if (completenessRun.status === "SUCCEEDED") {
    completenessResult = completenessRun.result;

    // Stage 9: CAPTURED -> INCOMPLETE|COMPLETE, then (if COMPLETE) immediately -> QUALIFIED.
    // Two sequential calls: each call only ever performs one hop of the transition table.
    await transitionQualification(lead.id, {
      completenessStatus: completenessResult.status,
      missingFields: completenessResult.missingFields,
    });
    await transitionQualification(lead.id, {});
  }

  // --- Automation 2: Scoring ---

  let scoringResult = {
    score: 0,
    matchedRules: [] as Array<{ ruleId: string; weight: number; reason: string }>,
    scoreVersion: "1.0.0",
  };

  const scoringRun = await runAutomation(
    { leadId: lead.id, automationType: "SCORING" },
    async () => {
      const result = calculateScore({
        eventTypeId: eventTypeRecord.id,
        city: input.city,
        eventDate: eventDate,
        guestCount: input.guestCount,
        budget: input.budget,
        services: input.services,
        whatsappConsent: input.whatsappConsent,
      });

      // Upsert lead score record
      await prisma.leadScore.upsert({
        where: { leadId: lead.id },
        create: {
          leadId: lead.id,
          score: result.score,
          matchedRules: (result.matchedRules as any),
          scoreVersion: result.scoreVersion,
        },
        update: {
          score: result.score,
          matchedRules: (result.matchedRules as any),
          scoreVersion: result.scoreVersion,
          calculatedAt: new Date(),
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { score: result.score, scoreVersion: result.scoreVersion },
      });

      await createAuditLog({
        entityType: "Lead",
        entityId: lead.id,
        action: "SCORE_CALCULATED",
        metadata: {
          score: result.score,
          scoreVersion: result.scoreVersion,
          matchedRulesCount: result.matchedRules.length,
        },
      });

      return result;
    }
  );

  if (scoringRun.status === "SUCCEEDED") {
    scoringResult = scoringRun.result;
  }

  // --- Automation 3: Matching ---

  const matchingRun = await runAutomation(
    { leadId: lead.id, automationType: "MATCHING" },
    async () => {
      const result = await runMatching({
        leadId: lead.id,
        eventTypeSlug: input.eventTypeSlug,
        city: input.city,
        eventDate: eventDate,
        services: input.services,
      });

      // Persist match results
      if (result.matches.length > 0) {
        await prisma.$transaction(
          result.matches.map((match) =>
            prisma.leadVendorMatch.upsert({
              where: {
                leadId_vendorId: {
                  leadId: lead.id,
                  vendorId: match.vendorId,
                },
              },
              create: {
                leadId: lead.id,
                vendorId: match.vendorId,
                eligible: match.eligible,
                reasons: match.reasons,
                availability: match.availability,
              },
              update: {
                eligible: match.eligible,
                reasons: match.reasons,
                availability: match.availability,
                matchedAt: new Date(),
              },
            })
          )
        );
      }

      await createAuditLog({
        entityType: "Lead",
        entityId: lead.id,
        action: "MATCHING_EXECUTED",
        metadata: {
          totalVendors: result.matches.length,
          eligibleCount: result.eligibleCount,
        },
      });

      return result;
    }
  );

  if (matchingRun.status === "SUCCEEDED") {
    // Stage 9: QUALIFIED -> ROUTED once at least one eligible vendor is found.
    // No-op if the lead isn't currently QUALIFIED (e.g. still INCOMPLETE).
    await transitionQualification(lead.id, {
      eligibleMatchCount: matchingRun.result.eligibleCount,
    });
  }

  // --- Automation 3.5: Vendor Opportunity Dispatch (Stage 18, Phase 18.0) ---
  // Runs once per lead, right after matching. Only eligible vendors get an
  // opportunity — an ineligible match is never contacted. "Dispatch" for v1 means
  // the row exists and is queryable by that vendor on their own dashboard — no
  // external channel (WhatsApp/SMS/push) is used or claimed (see opportunityService.ts).

  if (matchingRun.status === "SUCCEEDED") {
    await runAutomation(
      { leadId: lead.id, automationType: "OPPORTUNITY_DISPATCH" },
      async () => {
        const eligibleVendorIds = matchingRun.result.matches
          .filter((match) => match.eligible)
          .map((match) => match.vendorId);

        const now = new Date();
        for (const vendorId of eligibleVendorIds) {
          const opportunity = await prisma.vendorOpportunity.upsert({
            where: {
              leadId_vendorId: {
                leadId: lead.id,
                vendorId,
              },
            },
            create: {
              leadId: lead.id,
              vendorId,
              status: "SENT",
              responseDeadline: getResponseDeadline(now),
            },
            update: {}, // idempotent re-run must not reset an already-responded opportunity
          });

          await createAuditLog({
            entityType: "VendorOpportunity",
            entityId: opportunity.id,
            action: "VENDOR_OPPORTUNITY_CREATED",
            metadata: { leadId: lead.id, vendorId },
          });
        }

        return { dispatchedCount: eligibleVendorIds.length };
      }
    );
  }

  // --- Automation 4: WhatsApp Handoff (Stage 13) ---
  // Only attempted when the customer has actually consented. runAutomation already
  // gives this attempt/success/failure tracking for free via AutomationExecution +
  // AUTOMATION_STARTED/SUCCEEDED/FAILED audit logs — no separate tracking mechanism.

  if (input.whatsappConsent) {
    await runAutomation(
      { leadId: lead.id, automationType: "WHATSAPP_HANDOFF" },
      async () =>
        whatsApp.createHandoff(input.phone, {
          publicLeadId: lead.publicLeadId,
          eventTypeSlug: input.eventTypeSlug,
        })
    );
  }

  // ============================================================
  // STEP 8: Build authoritative response
  // Only report what actually happened
  // ============================================================

  const finalLead = await prisma.lead.findUnique({
    where: { id: lead.id },
  });

  // Stage 15 (Discovery, minimal slice): fetch the same match rows the pipeline just
  // wrote, with vendor/service detail — MatchingResult itself only carries vendorId,
  // not the vendor detail the customer-facing response needs.
  const finalQualification = await prisma.leadQualification.findUnique({
    where: { leadId: lead.id },
  });
  const matchRows = await prisma.leadVendorMatch.findMany({
    where: { leadId: lead.id },
    include: {
      vendor: {
        include: { services: { include: { service: true } } },
      },
    },
  });

  const durationMs = Date.now() - startTime;
  logger.info("Lead creation pipeline complete", {
    operation: "createLead",
    leadId: lead.id,
    publicLeadId: lead.publicLeadId,
    durationMs,
    completeness: completenessResult.status,
    score: scoringResult.score,
  });

  const nextAction =
    completenessResult.status === "INCOMPLETE"
      ? "INCOMPLETE"
      : matchingRun.status === "SUCCEEDED"
      ? "AWAITING_REVIEW"
      : "AWAITING_REVIEW";

  return {
    leadId: lead.id,
    publicLeadId: lead.publicLeadId,
    status: (finalLead?.status ?? "SUBMITTED") as "SUBMITTED",
    completenessStatus: completenessResult.status,
    missingFields: completenessResult.missingFields,
    score: scoringResult.score,
    matchedRules: scoringResult.matchedRules,
    scoreVersion: scoringResult.scoreVersion,
    qualificationStatus: finalQualification?.status ?? "CAPTURED",
    // vendorInterested is always false here — these VendorOpportunity rows were
    // just created synchronously in this same request (see runMatching() above),
    // so no vendor could possibly have responded yet.
    matches: toPublicMatches(matchRows.map((row) => ({ ...row, vendorInterested: false }))),
    nextAction,
  };
}

/**
 * Retrieves a lead by public ID for customer-facing display.
 * Only exposes data appropriate for customer context.
 * Does not expose internal IDs or sensitive operational data.
 */
export async function getLeadByPublicId(
  publicLeadId: string
): Promise<{
  publicLeadId: string;
  status: string;
  completenessStatus: string;
  eventDate?: string;
  eventType: string;
  guestCount?: number;
  budget: string | null;
  city: string;
  locality: string | null;
  services: string[];
  createdAt: string;
  qualificationStatus: QualificationStatus;
  missingFields: string[];
  matches: PublicVendorMatch[];
  quotes: PublicQuote[];
  bookingRequests: PublicBookingRequest[];
  bookings: PublicBooking[];
  whatsappConsent: boolean;
} | null> {
  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    select: {
      id: true,
      publicLeadId: true,
      status: true,
      completenessStatus: true,
      eventDate: true,
      eventType: { select: { name: true } },
      customEventTypeName: true,
      guestCount: true,
      budget: true,
      city: true,
      locality: true,
      services: true,
      createdAt: true,
      whatsappConsent: true,
      qualification: true,
      matches: {
        include: {
          vendor: {
            include: { services: { include: { service: true } } },
          },
        },
      },
    },
  });

  if (!lead) return null;

  // Vendor-interest signal for the matches section below. Same reasoning as
  // submittedOpportunities just below: VendorOpportunity has no FK relation to
  // LeadVendorMatch (independently keyed by leadId+vendorId), so this is its own
  // lightweight query — only status, keyed by vendorId, nothing else needed here.
  const opportunityStatusRows = await prisma.vendorOpportunity.findMany({
    where: { leadId: lead.id },
    select: { vendorId: true, status: true },
  });
  const opportunityStatusByVendorId = new Map(
    opportunityStatusRows.map((o) => [o.vendorId, o.status])
  );

  // Live availability refresh — see refreshMatchAvailability()'s doc comment.
  // Unlike eligibility (frozen at match time by design), a vendor can update
  // their availability at any time via setVendorAvailability(); this re-checks
  // it fresh on every status-page view so that update is actually visible.
  const liveAvailabilityByVendorId = await refreshMatchAvailability(
    lead.matches.map((m) => m.vendorId),
    lead.eventDate
  );

  // Stage 18, Phase 18.2 — submitted quotes for this lead. VendorOpportunity/Quote
  // have no FK relation to LeadVendorMatch (both are independently keyed by
  // leadId+vendorId), so this is a second, separate query, not nested above.
  const submittedOpportunities = await prisma.vendorOpportunity.findMany({
    where: { leadId: lead.id, status: "QUOTE_SUBMITTED" },
    include: {
      vendor: { include: { services: { include: { service: true } } } },
      quote: {
        include: {
          versions: { include: { lineItems: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  // Stage 18, Phase 18.4 — "current" is always derived (highest-versionNumber
  // SUBMITTED version), never a stored pointer. Defensive: an opportunity that
  // reached QUOTE_SUBMITTED should always have a current version by invariant, but
  // this stays defensive rather than assuming, same posture as Phase 18.2's original
  // `.filter((opp) => opp.quote !== null)`.
  const quotes = submittedOpportunities
    .map((opp) => {
      const current = opp.quote ? getCurrentVersion(opp.quote.versions) : null;
      if (!current) return null;
      return toPublicQuote({
        vendorId: opp.vendorId,
        vendorName: opp.vendor.name,
        city: opp.vendor.city,
        services: opp.vendor.services,
        submittedAt: current.submittedAt,
        messages: opp.quote?.messages ?? [],
        quote: current,
      });
    })
    .filter((quote): quote is NonNullable<typeof quote> => quote !== null);

  // Stage 19, Phase 19.0 — booking requests for this lead. Same reasoning as
  // submittedOpportunities above: no direct FK path from Lead, so a separate query.
  const bookingRequestRows = await prisma.bookingRequest.findMany({
    where: { opportunity: { leadId: lead.id } },
    include: {
      // vendor.services added so toPublicBookingRequest() can compute its
      // anonymized display name (getVendorDisplayName()) — toPublicBooking()
      // just below still uses vendor.name directly (the real name), unchanged.
      opportunity: { include: { vendor: { include: { services: { include: { service: true } } } } } },
      quoteVersion: { include: { lineItems: true } },
      // Stage 19, Phase 19.4 — deepened to fetch statusHistory too, for the booking timeline UI.
      booking: { include: { statusHistory: { orderBy: { createdAt: "asc" } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Stage 19, Phase 19.3 — expiry is a read-time derived fact, never stored (no
  // scheduler flips this column). A REQUESTED row past its responseDeadline is
  // reported to the customer as EXPIRED even though the DB still says REQUESTED.
  const now = new Date();

  const bookingRequests = bookingRequestRows.map((br) => {
    const effectiveStatus = isBookingRequestExpired(br, now) ? "EXPIRED" : br.status;
    return toPublicBookingRequest({
      vendorId: br.opportunity.vendorId,
      vendorName: br.opportunity.vendor.name,
      city: br.opportunity.vendor.city,
      services: br.opportunity.vendor.services,
      status: effectiveStatus,
      quoteTotal: calculateTotal(br.quoteVersion.lineItems),
      rejectionReason: br.rejectionReason,
      createdAt: br.createdAt,
      respondedAt: br.respondedAt,
    });
  });

  // Stage 19, Phase 19.2 — confirmed bookings, derived from the same rows (no new
  // query). Only rows that actually have a linked Booking (i.e. ACCEPTED) produce
  // an entry.
  const bookings: PublicBooking[] = bookingRequestRows
    .filter((br) => br.booking !== null)
    .map((br) =>
      toPublicBooking({
        publicBookingId: br.booking!.publicBookingId,
        vendorId: br.opportunity.vendorId,
        vendorName: br.opportunity.vendor.name,
        date: br.booking!.date,
        quoteTotal: calculateTotal(br.quoteVersion.lineItems),
        createdAt: br.booking!.createdAt,
        timeline: br.booking!.statusHistory,
        status: br.booking!.status,
      })
    );

  return {
    publicLeadId: lead.publicLeadId,
    status: lead.status,
    completenessStatus: lead.completenessStatus,
    eventDate: lead.eventDate?.toISOString(),
    eventType: formatEventTypeDisplay(lead.eventType.name, lead.customEventTypeName),
    guestCount: lead.guestCount ?? undefined,
    budget: lead.budget,
    city: lead.city,
    locality: lead.locality,
    // Human-readable names for the customer's OWN requested services — falls
    // back to the raw slug if a service was since deactivated/removed from the
    // catalog, rather than silently dropping it from what the customer sees
    // they asked for.
    services: lead.services.map((slug) => findServiceBySlug(slug)?.name ?? slug),
    createdAt: lead.createdAt.toISOString(),
    qualificationStatus: lead.qualification?.status ?? "CAPTURED",
    missingFields: lead.qualification?.missingFields ?? [],
    quotes,
    matches: toPublicMatches(
      lead.matches.map((match) => ({
        ...match,
        availability: liveAvailabilityByVendorId.get(match.vendorId) ?? match.availability,
        vendorInterested: indicatesInterest(
          opportunityStatusByVendorId.get(match.vendorId) ?? "CREATED"
        ),
      }))
    ),
    bookingRequests,
    bookings,
    whatsappConsent: lead.whatsappConsent,
  };
}

/**
 * Resumes an INCOMPLETE lead — Stage 9's "Continue" flow. Also handles the
 * separate post-match "edit my details" case (see the branch below) — one
 * function, one PATCH endpoint, two distinct authorization rules gated on
 * qualification status, per the work order's single-shared-handler constraint
 * (see LeadPatchSchema's comment in schemas.ts).
 *
 * Security/trust model, INCOMPLETE case: only fields currently listed in the
 * lead's LeadQualification.missingFields may be supplied — this matches the
 * existing GET endpoint's posture (knowledge of the public ID is treated as
 * sufficient capability to act on that lead) while still preventing
 * overwriting fields already correctly captured.
 *
 * Security/trust model, already-qualified case (COMPLETE/QUALIFIED/ROUTED/
 * QUALIFICATION_PENDING): a customer legitimately needs to correct their guest
 * count, budget, or event date after matching has already happened (e.g. the
 * date shifts, the headcount changes). This is allowed for exactly
 * POST_MATCH_EDITABLE_FIELDS below and nothing else:
 *  - eventDate/guestCount/budget are NOT among matchingService.ts's
 *    evaluateCompatibility() dimensions (city, event_type, service,
 *    profile_complete) — editing them can never invalidate a vendor's already-
 *    computed eligibility for this lead, so it's always safe.
 *  - `services` IS a matching dimension. Changing it post-match would silently
 *    invalidate vendors' existing eligibility without anything re-running
 *    matching to correct for it — this codebase deliberately never re-matches
 *    after creation (see matchingService.ts's point-in-time design, and the
 *    "Matched to vendors active when you submitted this request" note on the
 *    status page) — so `services` stays locked once qualification has moved
 *    past INCOMPLETE, exactly as it was before this edit-after-match path
 *    existed.
 *  - A CLOSED or INVALID lead (Lead.status, the coarse lifecycle field —
 *    distinct from LeadQualification.status) can no longer be edited at all.
 *
 * Note: editing eventDate on an already-ROUTED lead does NOT re-run matching
 * (who's eligible stays frozen, as documented above) — but availability IS
 * re-checked live against the new date on the very next status-page view, via
 * getLeadByPublicId()'s refreshMatchAvailability() call. Availability and
 * eligibility are deliberately different in this respect: eligibility is a
 * point-in-time decision, availability is a live fact.
 */
const CORE_RESUMABLE_FIELDS = [
  "eventDate",
  "guestCount",
  "budget",
  "services",
  "locality",
] as const;

// locality joins the always-safe set: like eventDate/guestCount/budget, it is
// NOT a matching dimension (informational only — see Lead.locality's schema
// comment), so editing it post-match can never invalidate a vendor's
// already-computed eligibility.
const POST_MATCH_EDITABLE_FIELDS = ["eventDate", "guestCount", "budget", "locality"] as const;

export async function resumeLead(
  publicLeadId: string,
  patch: {
    eventDate?: string;
    guestCount?: number;
    budget?: string;
    services?: string[];
    locality?: string;
    emailOptIn?: boolean;
    smsOptIn?: boolean;
  }
): Promise<{
  publicLeadId: string;
  completenessStatus: CompletenessStatus;
  missingFields: string[];
  qualificationStatus: QualificationStatus;
}> {
  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    include: { qualification: true },
  });

  if (!lead) {
    throw new NotFoundError("Lead");
  }

  if (!lead.qualification) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Lead qualification record is missing. Please contact support.",
      undefined,
      500
    );
  }

  // Communication preferences are freely updatable "anytime" (Stage 13 §13.4),
  // independent of qualification status — apply them first, unconditionally.
  if (patch.emailOptIn !== undefined || patch.smsOptIn !== undefined) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        emailOptIn: patch.emailOptIn,
        smsOptIn: patch.smsOptIn,
      },
    });
  }

  const corePatchKeys = Object.keys(patch).filter((f) =>
    (CORE_RESUMABLE_FIELDS as readonly string[]).includes(f)
  );

  // No core fields supplied (a preferences-only PATCH) — return current state as-is.
  if (corePatchKeys.length === 0) {
    return {
      publicLeadId: lead.publicLeadId,
      completenessStatus: lead.completenessStatus,
      missingFields: lead.qualification.missingFields,
      qualificationStatus: lead.qualification.status,
    };
  }

  const isIncomplete = lead.qualification.status === "INCOMPLETE";

  if (isIncomplete) {
    const missingFields = lead.qualification.missingFields;
    const disallowed = corePatchKeys.filter((f) => !missingFields.includes(f));

    if (disallowed.length > 0) {
      throw new ValidationError(
        "Only fields currently marked as missing can be updated.",
        Object.fromEntries(
          disallowed.map((f) => [
            f,
            "This field is not currently missing and cannot be changed.",
          ])
        )
      );
    }
  } else {
    // Post-match edit path — see this function's doc comment for the full
    // reasoning behind exactly which fields are allowed here and why.
    if (lead.status === "CLOSED" || lead.status === "INVALID") {
      throw new ValidationError(
        "This request is closed and can no longer be edited."
      );
    }

    // A confirmed booking means a real vendor has already committed to serving
    // this event on the details as originally submitted — silently changing
    // guestCount/eventDate/budget underneath that commitment, with no way to
    // notify the vendor, is exactly the kind of silent-invalidation this
    // codebase avoids everywhere else. Once booked, this becomes a
    // vendor-conversation, not a self-service edit.
    const confirmedBooking = await prisma.booking.findFirst({
      where: { status: "CONFIRMED", bookingRequest: { opportunity: { leadId: lead.id } } },
      select: { id: true },
    });
    if (confirmedBooking) {
      throw new ValidationError(
        "You already have a confirmed booking for this request. Please contact your vendor directly to change these details."
      );
    }

    const disallowed = corePatchKeys.filter(
      (f) => !(POST_MATCH_EDITABLE_FIELDS as readonly string[]).includes(f)
    );

    if (disallowed.length > 0) {
      throw new ValidationError(
        "Only event date, guest count, and budget can be changed once vendors have already been matched.",
        Object.fromEntries(
          disallowed.map((f) => [
            f,
            "This can no longer be changed after vendors have been matched.",
          ])
        )
      );
    }
  }

  await prisma.leadQualification.update({
    where: { leadId: lead.id },
    data: { status: beginResume(lead.qualification.status) },
  });

  const updatedEventDate =
    patch.eventDate !== undefined ? new Date(patch.eventDate) : lead.eventDate;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      eventDate:
        patch.eventDate !== undefined ? new Date(patch.eventDate) : undefined,
      guestCount: patch.guestCount !== undefined ? patch.guestCount : undefined,
      budget: patch.budget !== undefined ? patch.budget : undefined,
      services: patch.services !== undefined ? patch.services : undefined,
      locality: patch.locality !== undefined ? patch.locality : undefined,
    },
  });

  const result = evaluateCompleteness({
    eventTypeId: lead.eventTypeId,
    city: lead.city,
    eventDate: updatedEventDate,
    guestCount: patch.guestCount ?? lead.guestCount,
    budget: patch.budget ?? lead.budget,
    services: patch.services ?? lead.services,
    customerName: lead.customerName,
    phone: lead.phone,
    whatsappConsent: lead.whatsappConsent,
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { completenessStatus: result.status },
  });

  await createAuditLog({
    entityType: "Lead",
    entityId: lead.id,
    action: "COMPLETENESS_CALCULATED",
    metadata: {
      status: result.status,
      missingFields: result.missingFields,
      source: isIncomplete ? "resume" : "post_match_edit",
    },
  });

  // LEAD_UPDATED — reserved in AuditAction for exactly this: a customer-initiated
  // change to already-qualified lead details, distinct from the system-driven
  // COMPLETENESS_CALCULATED entry just above. Only fired for the post-match path;
  // the INCOMPLETE "resume" flow already has its own audit trail via that entry.
  if (!isIncomplete) {
    await createAuditLog({
      entityType: "Lead",
      entityId: lead.id,
      action: "LEAD_UPDATED",
      actorType: "USER",
      metadata: { fields: corePatchKeys },
    });
  }

  await transitionQualification(lead.id, {
    completenessStatus: result.status,
    missingFields: result.missingFields,
  });
  await transitionQualification(lead.id, {});

  const finalQualification = await prisma.leadQualification.findUnique({
    where: { leadId: lead.id },
  });

  return {
    publicLeadId: lead.publicLeadId,
    completenessStatus: result.status,
    missingFields: result.missingFields,
    qualificationStatus: finalQualification?.status ?? "INCOMPLETE",
  };
}

/**
 * Admin panel MVP — a flat list of every lead for the review queue. Unlike
 * every other query in this file, this one is intentionally not scoped to a
 * single lead; it exists only for the admin surface (middleware-gated).
 */
export async function listLeadsForAdmin(): Promise<
  {
    publicLeadId: string;
    customerName: string;
    phone: string;
    eventType: string;
    city: string;
    status: string;
    qualificationStatus: string;
    createdAt: string;
  }[]
> {
  const leads = await prisma.lead.findMany({
    select: {
      publicLeadId: true,
      customerName: true,
      phone: true,
      city: true,
      status: true,
      createdAt: true,
      eventType: { select: { name: true } },
      customEventTypeName: true,
      qualification: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return leads.map((lead) => ({
    publicLeadId: lead.publicLeadId,
    customerName: lead.customerName,
    phone: lead.phone,
    eventType: formatEventTypeDisplay(lead.eventType.name, lead.customEventTypeName),
    city: lead.city,
    status: lead.status,
    qualificationStatus: lead.qualification?.status ?? "CAPTURED",
    createdAt: lead.createdAt.toISOString(),
  }));
}

export interface AdminLeadDetail {
  publicLeadId: string;
  customerName: string;
  phone: string;
  eventType: string;
  city: string;
  locality: string | null;
  eventDate: string | null;
  guestCount: number | null;
  budget: string | null;
  services: string[];
  status: string;
  completenessStatus: string;
  qualificationStatus: string;
  whatsappConsent: boolean;
  emailOptIn: boolean;
  smsOptIn: boolean;
  dynamicAnswers: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Admin-only full lead detail — everything the customer actually submitted,
 * including customerName/phone. This is deliberately NOT the same shape as
 * getLeadByPublicId() (the customer-facing /status query) or
 * toPublicVendorProfile()-style mappers elsewhere in this codebase, which
 * intentionally strip contact details before reaching a customer or a vendor.
 * Admin is different: it's an internal, Basic-Auth-gated surface (see
 * proxy.ts's matcher) where ops genuinely needs to see and act on what a
 * customer submitted (call them, follow up, etc.) — there is no privacy rule
 * in this codebase that says admin shouldn't see this, only ones that say
 * customers and vendors shouldn't see each other's private fields.
 */
export async function getLeadDetailForAdmin(
  publicLeadId: string
): Promise<AdminLeadDetail | null> {
  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    include: {
      eventType: { select: { name: true } },
      qualification: { select: { status: true } },
    },
  });

  if (!lead) return null;

  return {
    publicLeadId: lead.publicLeadId,
    customerName: lead.customerName,
    phone: lead.phone,
    eventType: formatEventTypeDisplay(lead.eventType.name, lead.customEventTypeName),
    city: lead.city,
    locality: lead.locality,
    eventDate: lead.eventDate ? lead.eventDate.toISOString() : null,
    guestCount: lead.guestCount,
    budget: lead.budget,
    services: lead.services,
    status: lead.status,
    completenessStatus: lead.completenessStatus,
    qualificationStatus: lead.qualification?.status ?? "CAPTURED",
    whatsappConsent: lead.whatsappConsent,
    emailOptIn: lead.emailOptIn,
    smsOptIn: lead.smsOptIn,
    dynamicAnswers: lead.dynamicAnswers as Record<string, unknown> | null,
    createdAt: lead.createdAt.toISOString(),
  };
}

const ADMIN_EDITABLE_FIELDS = [
  "customerName",
  "phone",
  "city",
  "locality",
  "eventDate",
  "guestCount",
  "budget",
  "services",
] as const;

/**
 * Admin-only lead correction (Basic-Auth-gated internal ops surface — see
 * proxy.ts's matcher). Fixes the gap identified alongside the customer-facing
 * resumeLead() edit path: ops had no way to correct a customer's data-entry
 * mistake (wrong phone digit, misspelled city, etc.) short of a direct DB
 * write, since resumeLead() is deliberately restricted to the customer's own
 * safer field set and only outside CLOSED/INVALID/confirmed-booking states.
 *
 * Deliberately broader than resumeLead()'s customer-facing rules, and for a
 * different reason each:
 *  - No CLOSED/INVALID/confirmed-booking block — ops is exactly who needs to
 *    fix a lead that's already in one of those states (e.g. correcting the
 *    record before deciding whether to reopen it). This is a trusted internal
 *    surface, not a public one; the customer-facing restriction exists to
 *    prevent an anonymous phone-holder from rewriting a completed request,
 *    which doesn't apply to authenticated ops staff.
 *  - city AND services ARE editable here (unlike the customer path, which
 *    locks them once matched) — because ops fixing a genuine typo (e.g.
 *    "banglore" -> "Bangalore") is a real, common correction need. This does
 *    NOT re-run matching — this codebase deliberately never re-matches after
 *    lead creation (see matchingService.ts's point-in-time design) — so any
 *    vendors already matched remain matched against the OLD value. The admin
 *    edit form states this plainly so ops isn't misled into thinking a
 *    city/service correction retroactively fixes stale matches.
 *  - eventType is NOT editable here — it's a foreign-key relation to a fixed
 *    EventType catalog (not a free-text field like the others), and changing
 *    it is a rarer, more structural correction than this fixes; out of scope
 *    for this pass.
 *
 * Reuses evaluateCompleteness() (same pure function resumeLead() uses) to
 * keep completenessStatus honest after a correction, but deliberately does
 * NOT call transitionQualification() — that state machine exists for the
 * customer-driven qualification lifecycle (see qualificationService.ts); an
 * admin data correction is a different kind of event and shouldn't itself
 * advance or perturb that lifecycle.
 */
export async function updateLeadDetailsForAdmin(
  publicLeadId: string,
  patch: {
    customerName?: string;
    phone?: string;
    city?: string;
    locality?: string;
    eventDate?: string;
    guestCount?: number;
    budget?: string;
    services?: string[];
  }
): Promise<AdminLeadDetail> {
  const lead = await prisma.lead.findUnique({
    where: { publicLeadId },
    include: { qualification: true },
  });

  if (!lead) {
    throw new NotFoundError("Lead");
  }

  const patchKeys = Object.keys(patch).filter((f) =>
    (ADMIN_EDITABLE_FIELDS as readonly string[]).includes(f)
  ) as Array<keyof typeof patch>;

  if (patchKeys.length === 0) {
    const current = await getLeadDetailForAdmin(publicLeadId);
    // Cannot be null — we just confirmed the lead exists above.
    return current!;
  }

  const updatedEventDate =
    patch.eventDate !== undefined ? new Date(patch.eventDate) : lead.eventDate;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      customerName: patch.customerName,
      phone: patch.phone,
      city: patch.city,
      locality: patch.locality,
      eventDate: patch.eventDate !== undefined ? updatedEventDate : undefined,
      guestCount: patch.guestCount,
      budget: patch.budget,
      services: patch.services,
    },
  });

  const result = evaluateCompleteness({
    eventTypeId: lead.eventTypeId,
    city: patch.city ?? lead.city,
    eventDate: updatedEventDate,
    guestCount: patch.guestCount ?? lead.guestCount,
    budget: patch.budget ?? lead.budget,
    services: patch.services ?? lead.services,
    customerName: patch.customerName ?? lead.customerName,
    phone: patch.phone ?? lead.phone,
    whatsappConsent: lead.whatsappConsent,
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { completenessStatus: result.status },
  });

  if (lead.qualification) {
    await prisma.leadQualification.update({
      where: { leadId: lead.id },
      data: { missingFields: result.missingFields },
    });
  }

  await createAuditLog({
    entityType: "Lead",
    entityId: lead.id,
    action: "LEAD_UPDATED",
    actorType: "USER",
    metadata: { fields: patchKeys, source: "admin_correction" },
  });

  const updated = await getLeadDetailForAdmin(publicLeadId);
  // Cannot be null — this lead was just successfully updated above.
  return updated!;
}

/**
 * Permanently deletes a lead and everything that references it. Irreversible.
 *
 * Lead's direct children all already have onDelete: Cascade (LeadAttribution,
 * LeadEvent, LeadScore, LeadVendorMatch, LeadQualification,
 * AutomationExecution, VendorOpportunity), and VendorOpportunity itself
 * cascades further into Quote -> QuoteVersion -> QuoteLineItem/QuoteMessage
 * and into BookingRequest. The one gap (confirmed empirically this session
 * deleting a test vendor with the mirror-image bug): Booking.bookingRequest
 * has NO cascade, so a real confirmed Booking under this lead would block
 * BookingRequest's own cascade and throw a foreign key violation. Those
 * Booking rows (reached via lead -> opportunity -> bookingRequest -> booking)
 * are deleted first, same pre-clearing pattern as deleteVendorForAdmin().
 */
export async function deleteLeadForAdmin(publicLeadId: string): Promise<{ publicLeadId: string }> {
  const lead = await prisma.lead.findUnique({ where: { publicLeadId } });
  if (!lead) {
    throw new NotFoundError("Lead");
  }

  await prisma.$transaction([
    prisma.booking.deleteMany({
      where: { bookingRequest: { opportunity: { leadId: lead.id } } },
    }),
    prisma.lead.delete({ where: { id: lead.id } }),
  ]);

  await createAuditLog({
    entityType: "Lead",
    entityId: lead.id,
    action: "LEAD_DELETED",
    actorType: "USER",
    metadata: { publicLeadId },
  });

  return { publicLeadId };
}

export interface LeadSummary {
  publicLeadId: string;
  eventType: string;
  city: string;
  eventDate: string | null;
  status: string;
  createdAt: string;
  matchCount: number;
  quoteCount: number;
}

/**
 * Customer-facing "check my status" lookup (Stage 20 — phone-based, no
 * verification, an explicit, informed product decision — see
 * docs/customer-status-lookup-brief.md). Returns a lightweight summary per lead,
 * newest first — NOT the full matches/quotes/bookings detail getLeadByPublicId()
 * returns for a single lead; that shape is too expensive to compute for
 * potentially several leads at once, and the customer drills into one lead's full
 * detail via the existing /status/[publicLeadId] page, which already fetches it.
 *
 * Approach/scaling note, stated plainly per this feature's brief: Prisma cannot
 * express "compare ignoring formatting" against an arbitrarily-formatted stored
 * string in a single WHERE clause without raw SQL. This does a lightweight
 * first-pass query (id + phone only, every lead) to find which leads normalize to
 * a match, then a second query fetching full summary fields only for those
 * matched ids. Correct regardless of stored formatting; the first pass scans
 * every lead's phone column, which is fine at today's data volume but would be
 * worth revisiting (e.g. a stored normalized-phone column) if the leads table
 * grows large — not done here since that's a schema change, out of scope for
 * this brief.
 */
export async function getLeadSummariesByPhone(phone: string): Promise<LeadSummary[]> {
  const target = normalizePhoneLast10(phone);
  if (target.length !== 10) return [];

  const candidates = await prisma.lead.findMany({
    select: { id: true, phone: true },
  });
  const matchingIds = candidates
    .filter((c) => normalizePhoneLast10(c.phone) === target)
    .map((c) => c.id);

  if (matchingIds.length === 0) return [];

  const [leads, matchCounts, quoteCounts] = await Promise.all([
    prisma.lead.findMany({
      where: { id: { in: matchingIds } },
      select: {
        id: true,
        publicLeadId: true,
        city: true,
        eventDate: true,
        status: true,
        createdAt: true,
        eventType: { select: { name: true } },
        customEventTypeName: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leadVendorMatch.groupBy({
      by: ["leadId"],
      where: { leadId: { in: matchingIds }, eligible: true },
      _count: { _all: true },
    }),
    prisma.vendorOpportunity.groupBy({
      by: ["leadId"],
      where: { leadId: { in: matchingIds }, status: "QUOTE_SUBMITTED" },
      _count: { _all: true },
    }),
  ]);

  const matchCountByLead = new Map(matchCounts.map((m) => [m.leadId, m._count._all]));
  const quoteCountByLead = new Map(quoteCounts.map((q) => [q.leadId, q._count._all]));

  return leads.map((lead) => ({
    publicLeadId: lead.publicLeadId,
    eventType: formatEventTypeDisplay(lead.eventType.name, lead.customEventTypeName),
    city: lead.city,
    eventDate: lead.eventDate ? lead.eventDate.toISOString() : null,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    matchCount: matchCountByLead.get(lead.id) ?? 0,
    quoteCount: quoteCountByLead.get(lead.id) ?? 0,
  }));
}

export interface VendorBackfillResult {
  leadsEvaluated: number;
  opportunitiesCreated: number;
}

/**
 * Runs once, at vendor registration (Stage 21) — the mirror image of the normal
 * lead-side pipeline's "Automation 3: Matching" + "Automation 3.5: Vendor
 * Opportunity Dispatch" steps above, but from the vendor's side: for a
 * newly-registered vendor, finds still-open existing leads it would have been
 * matched to had it existed when they were submitted, and writes the exact same
 * LeadVendorMatch + VendorOpportunity rows that pipeline writes for a fresh lead.
 *
 * Reuses evaluateCompatibility() completely unchanged — eligibility here is
 * identical to what running a fresh lead through the normal pipeline today would
 * compute, not a separate or looser rule. This was an explicit, informed product
 * decision (a new vendor gets a one-time look at still-open leads, rather than
 * only ever seeing leads submitted after they joined) — not something to extend
 * beyond registration-time without a similar explicit decision.
 *
 * "Still open" = lead.status is neither CLOSED nor INVALID, and the event date is
 * either unset or still in the future — a lead for an event that has already
 * happened has no use for a new vendor opportunity. This mirrors LeadStatus's own
 * existing semantics rather than inventing new criteria.
 *
 * Known, inherited (not introduced here) limitation worth flagging: VendorService
 * rows are always created with eventTypes: [] at registration (see
 * /api/vendor/register/route.ts) and nothing else in this codebase ever populates
 * that array — so the "event_type" matching dimension can structurally never
 * contribute an EVENT_TYPE_MATCH for any vendor, backfilled or not. This function
 * does not attempt to fix that (it would change real eligibility outcomes
 * platform-wide, well beyond this feature's scope) — it faithfully reuses
 * whatever evaluateCompatibility() actually does today, bug-for-bug consistent
 * with fresh-lead matching.
 */
export async function backfillOpportunitiesForNewVendor(vendor: {
  id: string;
  name: string;
  city: string;
  active: boolean;
  profileComplete: boolean;
  services: { service: { slug: string }; eventTypes: string[] }[];
}): Promise<VendorBackfillResult> {
  const now = new Date();

  const candidateLeads = await prisma.lead.findMany({
    where: {
      status: { notIn: ["CLOSED", "INVALID"] },
      OR: [{ eventDate: null }, { eventDate: { gte: now } }],
    },
    select: {
      id: true,
      city: true,
      services: true,
      eventDate: true,
      eventType: { select: { slug: true } },
    },
  });

  let opportunitiesCreated = 0;

  for (const lead of candidateLeads) {
    const { eligible, reasons } = evaluateCompatibility(vendor, {
      leadId: lead.id,
      eventTypeSlug: lead.eventType.slug,
      city: lead.city,
      eventDate: lead.eventDate,
      services: lead.services,
    });

    const availability = eligible && lead.eventDate
      ? await checkVendorAvailability(vendor.id, lead.eventDate)
      : "UNKNOWN";

    // Mirrors the at-creation pipeline's own post-matching call (Automation 3,
    // above) — QUALIFIED -> ROUTED once at least one eligible vendor exists.
    // This was the missing piece of the backfill path: it wrote a real,
    // eligible LeadVendorMatch row but never advanced qualification, so a lead
    // whose only eligible vendor arrived via backfill (registered after the
    // lead was submitted, as opposed to being eligible at creation time) stayed
    // stuck reporting "still looking for a match" to the customer forever —
    // even after that vendor opened the opportunity and marked Interested.
    // Safe no-op for a lead that isn't currently QUALIFIED (already ROUTED,
    // still INCOMPLETE, etc.) — same guarantee transitionQualification always
    // provides, re-derived fresh from the stored status on every call.
    await transitionQualification(lead.id, {
      eligibleMatchCount: eligible ? 1 : 0,
    });

    await prisma.leadVendorMatch.upsert({
      where: { leadId_vendorId: { leadId: lead.id, vendorId: vendor.id } },
      create: { leadId: lead.id, vendorId: vendor.id, eligible, reasons, availability },
      update: { eligible, reasons, availability, matchedAt: now },
    });

    if (eligible) {
      const opportunity = await prisma.vendorOpportunity.upsert({
        where: { leadId_vendorId: { leadId: lead.id, vendorId: vendor.id } },
        create: {
          leadId: lead.id,
          vendorId: vendor.id,
          status: "SENT",
          responseDeadline: getResponseDeadline(now),
        },
        update: {}, // idempotent re-run must not reset an already-responded opportunity
      });
      opportunitiesCreated++;

      await createAuditLog({
        entityType: "VendorOpportunity",
        entityId: opportunity.id,
        action: "VENDOR_OPPORTUNITY_CREATED",
        metadata: { leadId: lead.id, vendorId: vendor.id, source: "NEW_VENDOR_BACKFILL" },
      });
    }
  }

  await createAuditLog({
    entityType: "Vendor",
    entityId: vendor.id,
    action: "VENDOR_BACKFILL_MATCHING_EXECUTED",
    metadata: { leadsEvaluated: candidateLeads.length, opportunitiesCreated },
  });

  return { leadsEvaluated: candidateLeads.length, opportunitiesCreated };
}
