/**
 * MuggedMoments — Dynamic Question Data Access (server-only)
 *
 * Reads the `Question` catalog (event-type-specific or global) from the database.
 * Pure condition/schema logic (safe to import from client components) lives in
 * dynamicQuestionRules.ts — this file must never be imported from a "use client"
 * component, since it imports the Prisma client singleton at module load.
 */

import prisma from "@/lib/db/prisma";
import { toDynamicQuestion, type DynamicQuestion } from "./dynamicQuestionRules";

/**
 * Fetches active questions relevant to a given event type: questions scoped to that
 * exact event type, plus event-type-agnostic questions (eventTypeId === null).
 * Sorted by `order` ascending. Returns [] if none exist — this is the expected,
 * common state today (no Question rows are seeded by default).
 */
export async function getActiveQuestionsForEventType(
  eventTypeId: string
): Promise<DynamicQuestion[]> {
  const rows = await prisma.question.findMany({
    where: {
      active: true,
      OR: [{ eventTypeId }, { eventTypeId: null }],
    },
    orderBy: { order: "asc" },
  });

  const result: DynamicQuestion[] = [];
  for (const row of rows) {
    const question = toDynamicQuestion(row);
    if (question) result.push(question);
  }
  return result;
}

export type { DynamicQuestion } from "./dynamicQuestionRules";
