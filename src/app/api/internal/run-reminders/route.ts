/**
 * MuggedMoments — GET/POST /api/internal/run-reminders
 *
 * Wired to Vercel Cron via vercel.json's `crons` entry (see repo root). Vercel's cron
 * dispatcher sends a GET request with `Authorization: Bearer <CRON_SECRET>` — see
 * proxy.ts's isCronAuthorized() for the matching auth check (a narrow, exact-pathname
 * bypass of the Basic Auth that otherwise gates all of /api/internal/*). POST is kept
 * for manual/admin-triggered runs authenticated the normal Basic Auth way.
 *
 * Finds INCOMPLETE/QUALIFIED leads, asks the deterministic follow-up engine whether a
 * reminder is due, and — if so — runs it through the existing runAutomation() wrapper
 * (idempotent per version, audit-logged) rather than a bespoke tracking mechanism.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getDueReminder } from "@/domain/followUp/followUpService";
import { runAutomation } from "@/services/automation/automationService";
import { whatsApp } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

async function runReminders(): Promise<NextResponse> {
  const leads = await prisma.lead.findMany({
    where: {
      qualification: { status: { in: ["INCOMPLETE", "QUALIFIED"] } },
    },
    include: { qualification: true },
  });

  const now = new Date();
  const results: Array<{ publicLeadId: string; sent: boolean }> = [];

  for (const lead of leads) {
    if (!lead.qualification) continue;

    const reminderCountSent = await prisma.automationExecution.count({
      where: {
        leadId: lead.id,
        automationType: "INCOMPLETE_REMINDER",
        status: "SUCCEEDED",
      },
    });

    const due = getDueReminder(
      {
        qualificationStatus: lead.qualification.status,
        updatedAt: lead.updatedAt,
      },
      reminderCountSent,
      now
    );

    if (!due) continue;

    const hasOptedInChannel =
      lead.whatsappConsent || lead.emailOptIn || lead.smsOptIn;

    const run = await runAutomation(
      {
        leadId: lead.id,
        automationType: "INCOMPLETE_REMINDER",
        version: due.version,
      },
      async () => {
        if (!hasOptedInChannel) {
          // A legitimate, logged no-op — not sending is the correct behaviour when no
          // channel is opted in, but it must still be recorded, not silently skipped.
          return { sent: false, reason: "no_channel_opted_in" };
        }

        if (lead.whatsappConsent) {
          const result = await whatsApp.sendMessage({
            to: lead.phone,
            body: `Reminder: ${due.reason}. Reference ${lead.publicLeadId}.`,
          });
          return { sent: result.success, reason: due.reason };
        }

        // Email/SMS sending has no provider in this codebase yet — recorded, not sent.
        return { sent: false, reason: "email_sms_provider_not_implemented" };
      }
    );

    results.push({
      publicLeadId: lead.publicLeadId,
      sent: run.status === "SUCCEEDED" ? run.result.sent : false,
    });
  }

  logger.info("Reminder run complete", {
    operation: "POST /api/internal/run-reminders",
    leadsChecked: leads.length,
    remindersProcessed: results.length,
  });

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(): Promise<NextResponse> {
  return runReminders();
}

export async function POST(): Promise<NextResponse> {
  return runReminders();
}
