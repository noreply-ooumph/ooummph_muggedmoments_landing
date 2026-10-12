/**
 * MuggedMoments — Interactive Event Journey Stepper
 *
 * Premium 4-Stage visual roadmap for customers on /status/[publicLeadId].
 * Fully interactive with hover & click selection to inspect every step detail.
 */

"use client";

import React, { useState } from "react";

interface EventJourneyStepperProps {
  status: string;
  qualificationStatus: string;
  preferredMeetingDate?: string;
  preferredMeetingTime?: string;
  hasQuotes: boolean;
  hasConfirmedBooking: boolean;
  eventDate?: string;
}

export function EventJourneyStepper({
  status,
  qualificationStatus,
  preferredMeetingDate,
  preferredMeetingTime,
  hasQuotes,
  hasConfirmedBooking,
  eventDate,
}: EventJourneyStepperProps) {
  // Determine actual system milestone (1 to 4)
  let currentStep = 1;
  if (status === "CLOSED" || hasConfirmedBooking) {
    currentStep = 4;
  } else if (status === "MATCHED" || hasQuotes) {
    currentStep = 3;
  } else if (status === "UNDER_REVIEW" || preferredMeetingDate || qualificationStatus === "ROUTED" || qualificationStatus === "QUALIFIED") {
    currentStep = 2;
  }

  // Interactive user selection state (hover or click)
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Active view step is the user's selected/hovered step if present, otherwise current system step
  const activeStep = selectedStep ?? currentStep;

  // Format meeting date if present
  const formattedMeetingDate = preferredMeetingDate
    ? new Date(preferredMeetingDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Calculate days remaining to event date if present
  let daysToEvent: number | null = null;
  if (eventDate) {
    const diff = new Date(eventDate).getTime() - new Date().getTime();
    daysToEvent = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const steps = [
    {
      step: 1,
      title: "Request Verified",
      subtitle: "Event details matched",
      icon: "✓",
      status: currentStep >= 1 ? "completed" : "pending",
    },
    {
      step: 2,
      title: "Expert Consultation",
      subtitle: formattedMeetingDate ? `${formattedMeetingDate}` : "Representative call",
      icon: "📞",
      status: currentStep > 2 ? "completed" : currentStep === 2 ? "active" : "pending",
    },
    {
      step: 3,
      title: "Vendor Quotes Studio",
      subtitle: hasQuotes ? "Quotes received" : "Preparing quotes",
      icon: "💼",
      status: currentStep > 3 ? "completed" : currentStep === 3 ? "active" : "pending",
    },
    {
      step: 4,
      title: "Event Booking & Lock",
      subtitle: hasConfirmedBooking ? "Vendor Locked!" : "Pre-event prep & lock",
      icon: "🎉",
      status: currentStep === 4 ? "completed" : "pending",
    },
  ];

  return (
    <div className="w-full bg-zinc-950/90 rounded-2xl p-6 border border-zinc-800/90 shadow-2xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Live Event Roadmap
            </span>
            <span className="text-[11px] text-zinc-400">
              💡 Hover or click any step to preview details
            </span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Your Event Progress</h3>
        </div>
        {daysToEvent !== null && (
          <div className="sm:text-right">
            <span className="text-xs text-zinc-400 block">Event Countdown</span>
            <span className="text-sm font-extrabold text-amber-400 font-mono">
              ⏳ {daysToEvent} Days Left
            </span>
          </div>
        )}
      </div>

      {/* 4 Interactive Step Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative mb-6">
        {steps.map((s) => {
          const isCompleted = s.status === "completed";
          const isActive = s.status === "active";
          const isSelected = activeStep === s.step;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setSelectedStep(s.step)}
              onMouseEnter={() => setSelectedStep(s.step)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                isSelected
                  ? "ring-2 ring-amber-400 border-amber-400 bg-amber-950/50 shadow-lg shadow-amber-500/20"
                  : isCompleted
                  ? "bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400"
                  : isActive
                  ? "bg-amber-950/30 border-amber-500/40 hover:border-amber-400"
                  : "bg-zinc-900/80 border-zinc-700/80 hover:border-zinc-500 text-zinc-200"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                  isCompleted
                    ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                    : isActive || isSelected
                    ? "bg-amber-400 text-zinc-950 border-amber-300 font-extrabold"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                }`}
              >
                {isCompleted ? "✓" : s.step}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-bold leading-snug break-words ${
                    isSelected || isActive
                      ? "text-amber-300 font-extrabold"
                      : isCompleted
                      ? "text-emerald-300"
                      : "text-zinc-200"
                  }`}
                >
                  {s.title}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug break-words">
                  {s.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Detail Card for Active/Selected Step */}
      {activeStep === 1 && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-zinc-900/60 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Step 1 — Request Submitted & Verified
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                Your event requirements have been recorded and matched with verified local vendors.
              </p>
              <p className="text-xs text-zinc-300 mt-1">
                Matching rules confirmed city eligibility, requested service categories, and guest parameters.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
            ✓ Verified
          </span>
        </div>
      )}

      {activeStep === 2 && (
        <div className="bg-gradient-to-r from-amber-950/50 via-amber-900/20 to-zinc-900/60 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Step 2 — Dedicated Representative Consultation
              </p>
              {formattedMeetingDate && preferredMeetingTime ? (
                <p className="text-sm font-semibold text-white mt-0.5">
                  Scheduled Consultation: <span className="text-amber-400 font-bold">{formattedMeetingDate}</span> at <span className="text-amber-400 font-bold">{preferredMeetingTime}</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-white mt-0.5">
                  Our representative will reach out shortly to guide you through matched vendors and customize packages.
                </p>
              )}
              <p className="text-xs text-zinc-300 mt-1">
                During this call, our event specialist will address your requirements, clear queries, and secure vendor quotes.
              </p>
            </div>
          </div>
          {formattedMeetingDate && (
            <a
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=MuggedMoments+Event+Consultation&details=Representative+consultation+for+your+event.&location=Phone+Call`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-bold px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-all"
            >
              📅 Add to Calendar
            </a>
          )}
        </div>
      )}

      {activeStep === 3 && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-zinc-900/60 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💼</span>
            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Step 3 — Vendor Quotations Studio
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {hasQuotes
                  ? "Official quotes have arrived! Review itemized costs and features below."
                  : "Matched vendors are actively reviewing your event specs to prepare custom quotes."}
              </p>
              <p className="text-xs text-zinc-300 mt-1">
                Compare itemized line items, ask questions directly via the Q&A thread, and lock official bookings.
              </p>
            </div>
          </div>
          {hasQuotes && (
            <a
              href="#quotes-section"
              className="shrink-0 text-xs font-extrabold px-4 py-2.5 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 transition-all shadow-md"
            >
              View Quotes ↓
            </a>
          )}
        </div>
      )}

      {activeStep === 4 && (
        <div className="bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-zinc-900/80 border border-emerald-500/50 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Step 4 — Event Booking & Pre-Event Checklist
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {hasConfirmedBooking
                ? "Congratulations! Your vendor booking is officially locked."
                : "Final step: Confirm your preferred vendor quote to lock your event date."}
            </p>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              Once locked, our concierge team coordinates venue walkthroughs, timeline planning, and final itinerary sync before your big day.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
