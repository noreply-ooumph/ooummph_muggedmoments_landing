/**
 * MuggedMoments — Progressive Multi-Step Form
 *
 * Collects event requirements step by step.
 * Each step validates before proceeding.
 * Values are preserved across steps.
 * Save/resume is supported with explicit user confirmation.
 *
 * Steps:
 * 1. Event Type
 * 2. Location (City)
 * 3. Event Date
 * 4. Event Details (Guest Count + Budget)
 * 5. Services Needed
 * 6. Dynamic Questions (event-type-specific, from the Question catalog — only shown
 *    when active questions exist for the selected event type; otherwise skipped)
 * 7. Contact Details
 * 8. Review + Submit
 *
 * The dynamic-questions slot always occupies raw step index 5 internally (so the fixed
 * indices for Contact=6 and Review=7 never shift), but is transparently skipped in
 * navigation and hidden from the progress indicator's step count when no active
 * questions apply to the selected event type — see `hasDynamicStep` below.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { Attribution, LeadResponse } from "@/types";
import { useFormState } from "@/hooks/useFormState";
import { useAttribution } from "@/hooks/useAttribution";
import { getActiveEventTypes, findEventTypeBySlug, formatEventTypeDisplay } from "@/config/event-types";
import { getActiveServices } from "@/config/services";
import { getServiceSuggestions } from "@/config/serviceSuggestions";
import {
  Button,
  Input,
  Select,
  Checkbox,
  ProgressIndicator,
  MultiSelectChips,
  Alert,
} from "@/components/ui";
import { SuccessConfirmation } from "@/components/success/SuccessConfirmation";
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  Step4Schema,
  Step5Schema,
  Step6Schema,
} from "@/lib/validation/schemas";
import {
  filterVisibleQuestions,
  buildDynamicQuestionSchema,
  type DynamicQuestion,
} from "@/domain/dynamicQuestions/dynamicQuestionRules";
import { track } from "@/lib/analytics";

// Raw internal step-index count. Always 8 regardless of whether the dynamic-questions
// slot (index 5) has anything to show — see `visibleStepCount` for the number actually
// displayed to the user.
const TOTAL_STEPS = 8;

// Below this many selected services, the services step offers the suggestion
// nudge (see getServiceSuggestions()) instead of advancing immediately —
// never a hard block, always skippable via "Continue Without Adding".
const SERVICE_NUDGE_MAX_COUNT = 1;

interface ProgressiveFormProps {
  initialEventSlug?: string; // from URL preselection
  // Optional service-slug preselection (e.g. /find-photographer). Mirrors
  // initialEventSlug's existing apply-once-on-mount pattern below; only takes
  // effect when the form has no services selected yet, so it never overwrites
  // a resumed/in-progress selection.
  initialServices?: string[];
  // Optional city preselection (e.g. from a vendor's public profile page). Same
  // apply-once-on-mount pattern as initialServices — only takes effect when the
  // city field is currently empty, never overwrites a resumed/in-progress session.
  initialCity?: string;
  attribution?: Attribution | null;
  onSuccess?: (response: LeadResponse) => void;
  onCancel?: () => void;
}

type FieldErrors = Record<string, string>;

export function ProgressiveForm({
  initialEventSlug,
  initialServices,
  initialCity,
  attribution: propAttribution,
  onSuccess,
  onCancel,
}: ProgressiveFormProps) {
  const hookAttribution = useAttribution();
  const attribution = propAttribution ?? hookAttribution;
  const {
    formState,
    hasSavedState,
    resumeState,
    startFresh,
    updateValues,
    nextStep,
    prevStep,
  } = useFormState(TOTAL_STEPS, attribution);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<LeadResponse | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);

  // Service-suggestion nudge (services step) — shown at most once per session;
  // once dismissed (either way) it never reappears even if the customer goes
  // Back and forward through the step again.
  const [showServiceNudge, setShowServiceNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeSelections, setNudgeSelections] = useState<string[]>([]);

  const eventTypes = getActiveEventTypes();
  const services = getActiveServices();

  // Fetch the active Question catalog for the selected event type. Server-only Prisma
  // access lives behind /api/questions (this is a client component). An empty/failed
  // result degrades to "no dynamic questions" — the pre-existing 7-step flow.
  useEffect(() => {
    let cancelled = false;
    const eventTypeSlug = formState.values.eventTypeSlug;

    const questionsPromise: Promise<DynamicQuestion[]> = eventTypeSlug
      ? fetch(`/api/questions?eventTypeSlug=${encodeURIComponent(eventTypeSlug)}`)
          .then((res) => (res.ok ? res.json() : { questions: [] }))
          .then((data: { questions?: DynamicQuestion[] }) => data.questions ?? [])
          .catch(() => [])
      : Promise.resolve([]);

    questionsPromise.then((questions) => {
      if (!cancelled) setDynamicQuestions(questions);
    });

    return () => {
      cancelled = true;
    };
  }, [formState.values.eventTypeSlug]);

  // Questions whose displayCondition (if any) currently passes against collected values.
  const visibleDynamicQuestions = filterVisibleQuestions(
    dynamicQuestions,
    formState.values as Record<string, unknown>
  );
  const hasDynamicStep = visibleDynamicQuestions.length > 0;
  // Number of steps actually shown to the user — 8 when the dynamic step is present,
  // 7 (today's existing behavior) when it is not.
  const visibleStepCount = hasDynamicStep ? TOTAL_STEPS : TOTAL_STEPS - 1;

  // Validate event preselection
  const preselectedSlug =
    initialEventSlug && findEventTypeBySlug(initialEventSlug)
      ? initialEventSlug
      : undefined;

  // Apply preselection on mount if values are empty
  useEffect(() => {
    if (preselectedSlug && !formState.values.eventTypeSlug) {
      updateValues({ eventTypeSlug: preselectedSlug });
    }
  }, [preselectedSlug]);

  // Apply service preselection on mount if no services are selected yet —
  // same apply-once-if-empty pattern as the event-type preselection above.
  useEffect(() => {
    if (
      initialServices &&
      initialServices.length > 0 &&
      (formState.values.services ?? []).length === 0
    ) {
      updateValues({ services: initialServices });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialServices]);

  // Apply city preselection on mount if the city field is currently empty — same
  // apply-once-if-empty pattern as the event-type/service preselections above.
  useEffect(() => {
    if (initialCity && !formState.values.city) {
      updateValues({ city: initialCity });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCity]);

  // Validate current step before proceeding
  function validateStep(step: number): boolean {
    const values = formState.values;
    const newErrors: FieldErrors = {};

    try {
      switch (step) {
        case 0:
          Step1Schema.parse({
            eventTypeSlug: values.eventTypeSlug,
            customEventTypeName: values.customEventTypeName,
          });
          break;
        case 1:
          Step2Schema.parse({ city: values.city, locality: values.locality });
          break;
        case 2:
          if (values.eventDate) {
            Step3Schema.parse({ eventDate: values.eventDate });
          }
          break;
        case 3:
          Step4Schema.parse({
            guestCount: values.guestCount,
            budget: values.budget,
          });
          break;
        case 4:
          Step5Schema.parse({ services: values.services ?? [] });
          break;
        case 5:
          // Dynamic Questions step — skipped/no-op when nothing is visible for this
          // event type (the step is also never navigated to in that case).
          if (visibleDynamicQuestions.length > 0) {
            buildDynamicQuestionSchema(visibleDynamicQuestions).parse(
              values.dynamicAnswers ?? {}
            );
          }
          break;
        case 6:
          Step6Schema.parse({
            customerName: values.customerName,
            phone: values.phone,
            whatsappConsent: values.whatsappConsent ?? false,
          });
          break;
      }
      setErrors({});
      return true;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const zodErr = err as { errors: Array<{ path: string[]; message: string }> };
        for (const issue of zodErr.errors) {
          const field = issue.path.join(".");
          if (field && !newErrors[field]) {
            newErrors[field] = issue.message;
          }
        }
        setErrors(newErrors);
        return false;
      }
      return false;
    }
  }

  // Advances past the services step for real — the shared tail end of both
  // "Continue Without Adding" and the normal (non-nudged) Next click, so the
  // dynamic-questions skip logic below only has to live in one place.
  function advancePastServices() {
    if (!hasDynamicStep) {
      // No dynamic questions apply to this event type — skip the empty slot (index 5)
      // and land directly on Contact Details (index 6).
      nextStep();
      nextStep();
      return;
    }
    nextStep();
  }

  function handleNext() {
    if (!validateStep(formState.currentStep)) return;
    track("form_field_complete", { step: formState.currentStep });

    if (formState.currentStep === 4 && !nudgeDismissed) {
      const suggestions = getServiceSuggestions(
        formState.values.eventTypeSlug,
        formState.values.services ?? []
      );
      if (
        (formState.values.services ?? []).length <= SERVICE_NUDGE_MAX_COUNT &&
        suggestions.length > 0
      ) {
        setNudgeSelections([]);
        setShowServiceNudge(true);
        track("service_nudge_shown", { step: formState.currentStep });
        return;
      }
    }

    if (formState.currentStep === 4) {
      advancePastServices();
      return;
    }
    nextStep();
  }

  // "Add These & Continue" — merges whichever suggested chips the customer
  // toggled on (if any) into their services selection, never removes anything
  // they'd already picked.
  function handleNudgeAddAndContinue() {
    if (nudgeSelections.length > 0) {
      const current = formState.values.services ?? [];
      updateValues({ services: [...current, ...nudgeSelections] });
    }
    track("service_nudge_accepted", { addedCount: nudgeSelections.length });
    setNudgeDismissed(true);
    setShowServiceNudge(false);
    advancePastServices();
  }

  // "Continue Without Adding" — leaves the services selection exactly as the
  // customer left it; the nudge never blocks progress, only offers it once.
  function handleNudgeSkip() {
    track("service_nudge_skipped");
    setNudgeDismissed(true);
    setShowServiceNudge(false);
    advancePastServices();
  }

  function toggleNudgeSelection(slug: string) {
    setNudgeSelections((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  // Contact Details' "Back" button needs the same skip awareness as handleNext, since
  // the dynamic-questions slot (index 5) sits directly behind it. Every other step's
  // Back button uses `prevStep` directly and is unaffected.
  function handleBackFromContact() {
    if (!hasDynamicStep) {
      prevStep();
      prevStep();
      return;
    }
    prevStep();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(6)) return;

    track("form_submit_attempt");
    setIsSubmitting(true);
    setSubmitError(null);

    const values = formState.values;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: formState.idempotencyKey,
          eventTypeSlug: values.eventTypeSlug,
          customEventTypeName: values.customEventTypeName,
          city: values.city,
          locality: values.locality,
          eventDate: values.eventDate,
          guestCount: values.guestCount,
          budget: values.budget,
          services: values.services ?? [],
          customerName: values.customerName,
          phone: values.phone,
          whatsappConsent: values.whatsappConsent ?? false,
          attribution: formState.attribution,
          dynamicAnswers: values.dynamicAnswers ?? {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        track("lead_submit_error", { statusCode: response.status });
        if (data?.error?.fields) {
          setErrors(data.error.fields as FieldErrors);
          setSubmitError(data.error.message ?? "Please correct the highlighted fields.");
        } else {
          setSubmitError(
            data?.error?.message ?? "Something went wrong. Please try again."
          );
        }
        return;
      }

      track("lead_submit_success");
      track("lead_created", { publicLeadId: data.publicLeadId });
      setSuccess(data as LeadResponse);
      onSuccess?.(data as LeadResponse);
    } catch {
      track("lead_submit_error", { statusCode: 0 });
      setSubmitError(
        "We couldn't connect to our servers. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ============================================================
  // SAVE / RESUME BANNER
  // ============================================================

  if (hasSavedState && !hasStarted) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <div className="text-3xl mb-4">💾</div>
        <h3 className="text-xl font-bold text-white mb-2">
          Continue where you left off?
        </h3>
        <p className="text-white/60 text-sm mb-6">
          You have a partially completed event request saved from a recent session.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => {
              resumeState();
              setHasStarted(true);
              track("form_start");
            }}
            id="resume-form-button"
          >
            Continue
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              startFresh(attribution);
              setHasStarted(true);
              track("form_start");
            }}
            id="start-fresh-button"
          >
            Start Again
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================

  if (success) {
    return <SuccessConfirmation response={success} />;
  }

  const values = formState.values;
  const currentStep = formState.currentStep;
  // When the dynamic step is absent, raw indices 6 (Contact) and 7 (Review) must display
  // as 6 and 7 (not 7 and 8) to match the pre-existing 7-step progress display exactly.
  const displayStep =
    hasDynamicStep || currentStep < 5 ? currentStep + 1 : currentStep;

  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="mb-6">
        <ProgressIndicator
          currentStep={displayStep}
          totalSteps={visibleStepCount}
          label={`Form progress: step ${displayStep} of ${visibleStepCount}`}
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        {submitError && (
          <div className="mb-6">
            <Alert type="error">{submitError}</Alert>
          </div>
        )}

        {/* STEP 1: Event Type */}
        {currentStep === 0 && (
          <FormStep title="What type of event are you planning?">
            <div className="grid grid-cols-1 gap-3">
              {eventTypes.map((et) => (
                <button
                  key={et.slug}
                  type="button"
                  onClick={() => {
                    updateValues({ eventTypeSlug: et.slug });
                    track("event_type_select", { eventType: et.slug });
                  }}
                  className={`
                    w-full text-left px-5 py-4 rounded-xl border transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                    ${
                      values.eventTypeSlug === et.slug
                        ? "border-violet-500 bg-violet-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                    }
                  `}
                  aria-pressed={values.eventTypeSlug === et.slug}
                  id={`event-type-${et.slug}`}
                >
                  <span className="font-medium">{et.name}</span>
                </button>
              ))}
            </div>
            {errors.eventTypeSlug && (
              <Alert type="error">{errors.eventTypeSlug}</Alert>
            )}
            {values.eventTypeSlug === "other" && (
              <div className="mt-3">
                <Input
                  id="custom-event-type-name"
                  label="What's the event?"
                  type="text"
                  placeholder="e.g. Baby Shower, Anniversary"
                  value={values.customEventTypeName ?? ""}
                  onChange={(e) => updateValues({ customEventTypeName: e.target.value })}
                  error={errors.customEventTypeName}
                  required
                  autoFocus
                />
              </div>
            )}
            <StepNavigation
              onNext={handleNext}
              showBack={false}
              nextDisabled={
                !values.eventTypeSlug ||
                (values.eventTypeSlug === "other" && !values.customEventTypeName?.trim())
              }
            />
          </FormStep>
        )}

        {/* STEP 2: City */}
        {currentStep === 1 && (
          <FormStep title="Where is your event happening?">
            <Input
              id="city"
              label="City"
              type="text"
              placeholder="e.g. Mumbai"
              value={values.city ?? ""}
              onChange={(e) => updateValues({ city: e.target.value })}
              error={errors.city}
              required
              autoComplete="address-level2"
              autoFocus
            />
            <Input
              id="locality"
              label="Locality / Area (optional)"
              type="text"
              placeholder="e.g. Andheri West"
              value={values.locality ?? ""}
              onChange={(e) => updateValues({ locality: e.target.value })}
              error={errors.locality}
              helpText="Helps vendors and our team understand your area better. Doesn't affect who you're matched with."
              autoComplete="address-level3"
            />
            <StepNavigation
              onNext={handleNext}
              onBack={prevStep}
              nextDisabled={!values.city?.trim()}
            />
          </FormStep>
        )}

        {/* STEP 3: Event Date */}
        {currentStep === 2 && (
          <FormStep title="When is your event?">
            <Input
              id="event-date"
              label="Event Date"
              type="date"
              value={values.eventDate ?? ""}
              onChange={(e) => updateValues({ eventDate: e.target.value })}
              error={errors.eventDate}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              autoFocus
            />
            <StepNavigation
              onNext={handleNext}
              onBack={prevStep}
              nextLabel="Next"
            />
          </FormStep>
        )}

        {/* STEP 4: Event Details */}
        {currentStep === 3 && (
          <FormStep title="Tell us about your event">
            <Input
              id="guest-count"
              label="Approximate Guest Count"
              type="number"
              placeholder="e.g. 150"
              min={1}
              max={100000}
              value={values.guestCount?.toString() ?? ""}
              onChange={(e) =>
                updateValues({
                  guestCount: e.target.value
                    ? parseInt(e.target.value, 10)
                    : undefined,
                })
              }
              error={errors.guestCount}
              autoFocus
            />
            <div className="text-xs text-white/40 mt-1">
              Budget options — CONFIGURATION_REQUIRED by business before launch
            </div>
            {/* Budget field intentionally left as free text until tiers are approved */}
            <Input
              id="budget"
              label="Approximate Budget (optional)"
              type="text"
              placeholder="e.g. ₹5,00,000"
              value={values.budget ?? ""}
              onChange={(e) => updateValues({ budget: e.target.value })}
              error={errors.budget}
              helpText="CONFIGURATION_REQUIRED: Budget tiers will be added once approved"
            />
            <StepNavigation onNext={handleNext} onBack={prevStep} />
          </FormStep>
        )}

        {/* STEP 5: Services */}
        {currentStep === 4 && !showServiceNudge && (
          <FormStep title="What services do you need?">
            <MultiSelectChips
              label="Select all that apply"
              options={services.map((s) => ({ value: s.slug, label: s.name }))}
              value={values.services ?? []}
              onChange={(selected) => updateValues({ services: selected })}
              error={errors.services}
              required
            />
            <StepNavigation
              onNext={handleNext}
              onBack={prevStep}
              nextDisabled={(values.services ?? []).length === 0}
            />
          </FormStep>
        )}

        {/* STEP 5b: Service suggestion nudge — shown at most once, only when the
            customer selected SERVICE_NUDGE_MAX_COUNT or fewer services and this
            event type has configured suggestions left to offer. Never a hard
            block — "Continue Without Adding" always proceeds. See
            serviceSuggestions.ts's header comment for why this never claims a
            popularity/statistics figure. */}
        {currentStep === 4 && showServiceNudge && (
          <FormStep title="Want to add anything else?">
            <p className="text-sm text-white/60 mb-4">
              You might also want these for your{" "}
              {eventTypes.find((et) => et.slug === values.eventTypeSlug)?.name ??
                "event"}
              :
            </p>
            <div className="flex flex-col gap-3 mb-4">
              {getServiceSuggestions(values.eventTypeSlug, values.services ?? []).map(
                (slug) => {
                  const service = services.find((s) => s.slug === slug);
                  if (!service) return null;
                  return (
                    <Checkbox
                      key={slug}
                      label={service.name}
                      checked={nudgeSelections.includes(slug)}
                      onChange={() => toggleNudgeSelection(slug)}
                    />
                  );
                }
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleNudgeAddAndContinue} id="nudge-add-continue">
                {nudgeSelections.length > 0 ? "Add These & Continue" : "Continue"}
              </Button>
              <Button variant="secondary" onClick={handleNudgeSkip} id="nudge-skip">
                Continue Without Adding
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowServiceNudge(false)}
              className="mt-3 text-sm text-white/50 underline hover:text-white/80"
            >
              ← Back to edit my services
            </button>
          </FormStep>
        )}

        {/* DYNAMIC STEP: Event-type-specific questions (only when active questions exist) */}
        {currentStep === 5 && hasDynamicStep && (
          <FormStep title="A few more details about your event">
            <div className="flex flex-col gap-4">
              {visibleDynamicQuestions.map((question) => (
                <DynamicQuestionField
                  key={question.questionKey}
                  question={question}
                  value={values.dynamicAnswers?.[question.questionKey] ?? null}
                  error={errors[question.questionKey]}
                  onChange={(answer) =>
                    updateValues({
                      dynamicAnswers: {
                        ...(values.dynamicAnswers ?? {}),
                        [question.questionKey]: answer,
                      },
                    })
                  }
                />
              ))}
            </div>
            <StepNavigation onNext={handleNext} onBack={prevStep} />
          </FormStep>
        )}

        {/* STEP 7: Contact Details */}
        {currentStep === 6 && (
          <FormStep title="How can we reach you?">
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-4">
                <Input
                  id="customer-name"
                  label="Your Name"
                  type="text"
                  placeholder="Your full name"
                  value={values.customerName ?? ""}
                  onChange={(e) =>
                    updateValues({ customerName: e.target.value })
                  }
                  error={errors.customerName}
                  required
                  autoComplete="name"
                  autoFocus
                />
                <Input
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={values.phone ?? ""}
                  onChange={(e) => updateValues({ phone: e.target.value })}
                  error={errors.phone}
                  required
                  autoComplete="tel"
                />
                <Checkbox
                  id="whatsapp-consent"
                  checked={values.whatsappConsent ?? false}
                  onChange={(e) =>
                    updateValues({ whatsappConsent: e.target.checked })
                  }
                  error={errors.whatsappConsent}
                  label={
                    // TRAI TCCCPR-compliant wording — see
                    // docs/legal-copy-open-items.md. The source doc's exact string
                    // also has a "write to [grievance email]" clause; dropped here
                    // (not fabricated) since no real grievance officer/email exists
                    // yet — add it back once that fact is real, per the same doc.
                    <span>
                      I agree to be contacted by MuggedMoments — by WhatsApp,
                      call, or SMS — about this event requirement, including
                      by the venues/vendors I choose to enquire with. Reply
                      STOP anytime to withdraw. Msg/data rates may apply. Read
                      our{" "}
                      <Link
                        href="/privacy"
                        onClick={(e) => e.stopPropagation()}
                        className="underline hover:text-white"
                      >
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/terms"
                        onClick={(e) => e.stopPropagation()}
                        className="underline hover:text-white"
                      >
                        Terms
                      </Link>
                      .{" "}
                      <span className="text-white/40 text-xs">(optional)</span>
                    </span>
                  }
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackFromContact}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  className="flex-1"
                >
                  Review →
                </Button>
              </div>
            </form>
          </FormStep>
        )}

        {/* STEP 8: Review + Submit */}
        {currentStep === 7 && (
          <FormStep title="Review your request">
            <div className="flex flex-col gap-3 text-sm">
              <ReviewRow
                label="Event Type"
                value={formatEventTypeDisplay(
                  eventTypes.find((et) => et.slug === values.eventTypeSlug)?.name ??
                    values.eventTypeSlug ??
                    "—",
                  values.eventTypeSlug === "other" ? values.customEventTypeName : undefined
                )}
              />
              <ReviewRow label="City" value={values.city ?? "—"} />
              {values.locality?.trim() && (
                <ReviewRow label="Locality / Area" value={values.locality} />
              )}
              <ReviewRow
                label="Event Date"
                value={
                  values.eventDate
                    ? new Date(values.eventDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Not specified"
                }
              />
              <ReviewRow
                label="Guest Count"
                value={values.guestCount?.toString() ?? "Not specified"}
              />
              <ReviewRow
                label="Budget"
                value={values.budget ?? "Not specified"}
              />
              <ReviewRow
                label="Services"
                value={
                  values.services && values.services.length > 0
                    ? values.services
                        .map(
                          (slug) =>
                            services.find((s) => s.slug === slug)?.name ?? slug
                        )
                        .join(", ")
                    : "—"
                }
              />
              <ReviewRow label="Your Name" value={values.customerName ?? "—"} />
              <ReviewRow
                label="Phone"
                value={
                  values.phone
                    ? `•••• ${values.phone.slice(-4)}`
                    : "—"
                }
              />
              <ReviewRow
                label="WhatsApp Consent"
                value={values.whatsappConsent ? "Yes" : "No"}
              />
              {visibleDynamicQuestions.map((question) => (
                <ReviewRow
                  key={question.questionKey}
                  label={question.label}
                  value={formatDynamicAnswer(
                    values.dynamicAnswers?.[question.questionKey],
                    question
                  )}
                />
              ))}
            </div>
            <form onSubmit={handleSubmit} noValidate className="mt-6">
              {submitError && (
                <div className="mb-4">
                  <Alert type="error">{submitError}</Alert>
                </div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={prevStep}>
                  Edit
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  className="flex-1"
                  id="submit-request-button"
                >
                  {isSubmitting ? "Sending..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </FormStep>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function FormStep({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

function StepNavigation({
  onNext,
  onBack,
  showBack = true,
  nextDisabled = false,
  nextLabel = "Next →",
}: {
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3 mt-4">
      {showBack && onBack && (
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
      )}
      <Button
        type="button"
        variant="primary"
        onClick={onNext}
        disabled={nextDisabled}
        className={showBack ? "flex-1" : "w-full"}
        id="form-next-button"
      >
        {nextLabel}
      </Button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5">
      <span className="text-white/50 shrink-0">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  );
}

// ============================================================
// DYNAMIC QUESTION FIELD (renders a single Question-catalog-driven field)
// ============================================================

type DynamicAnswerValue = string | number | boolean | string[] | null;

function DynamicQuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: DynamicQuestion;
  value: DynamicAnswerValue;
  error?: string;
  onChange: (value: DynamicAnswerValue) => void;
}) {
  const options = question.options ?? [];

  switch (question.fieldType) {
    case "text":
      return (
        <Input
          id={`dynamic-${question.questionKey}`}
          label={question.label}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          required={question.required}
        />
      );

    case "phone":
      return (
        <Input
          id={`dynamic-${question.questionKey}`}
          label={question.label}
          type="tel"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          required={question.required}
        />
      );

    case "number":
      return (
        <Input
          id={`dynamic-${question.questionKey}`}
          label={question.label}
          type="number"
          value={typeof value === "number" ? value.toString() : ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          error={error}
          required={question.required}
        />
      );

    case "date":
      return (
        <Input
          id={`dynamic-${question.questionKey}`}
          label={question.label}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          required={question.required}
        />
      );

    case "select":
      return (
        <Select
          id={`dynamic-${question.questionKey}`}
          label={question.label}
          options={options}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          required={question.required}
        />
      );

    case "multiselect":
      return (
        <MultiSelectChips
          label={question.label}
          options={options}
          value={Array.isArray(value) ? value : []}
          onChange={(selected) => onChange(selected)}
          error={error}
          required={question.required}
        />
      );

    case "checkbox":
      return (
        <Checkbox
          id={`dynamic-${question.questionKey}`}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          error={error}
          label={question.label}
        />
      );

    default:
      return null;
  }
}

/**
 * Formats a stored dynamic answer for the Review step — resolves select/multiselect
 * option values back to their human-readable labels.
 */
function formatDynamicAnswer(
  value: DynamicAnswerValue | undefined,
  question: DynamicQuestion
): string {
  if (value === null || value === undefined || value === "") return "—";

  const options = question.options ?? [];

  if (question.fieldType === "select" && typeof value === "string") {
    return options.find((o) => o.value === value)?.label ?? value;
  }

  if (question.fieldType === "multiselect" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }

  if (question.fieldType === "checkbox") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
