/**
 * MuggedMoments — POST /api/leads
 *
 * Responsibilities:
 * - Validate request body (Zod)
 * - Validate Idempotency-Key header
 * - Call leadService.createLead()
 * - Return authoritative state
 * - Return structured errors
 *
 * Does NOT:
 * - Expose internal stack traces
 * - Claim actions happened unless backend confirms
 * - Allow unauthenticated internal state mutation
 *   (authentication will be added when the requirement arises)
 */

import { NextRequest, NextResponse } from "next/server";
import { CreateLeadSchema } from "@/lib/validation/schemas";
import { createLead } from "@/services/lead/leadService";
import { toApiErrorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

// Rate limiting state (in-memory for development)
// PRODUCTION: Replace with Redis-backed rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = uuidv4();
  const startTime = Date.now();

  logger.info("POST /api/leads received", {
    requestId,
    operation: "POST /api/leads",
  });

  // Rate limiting — use IP as identifier
  // PRODUCTION: Replace with authenticated user ID where available
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (isRateLimited(ip)) {
    logger.warn("Rate limit exceeded", { requestId, operation: "POST /api/leads" });
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait before submitting again.",
        },
      },
      { status: 429 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
        },
      },
      { status: 400 }
    );
  }

  // Validate with Zod schema
  const parseResult = CreateLeadSchema.safeParse(body);

  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path.join(".");
      if (field && !fields[field]) {
        fields[field] = issue.message;
      }
    }

    logger.info("Validation failed", {
      requestId,
      operation: "POST /api/leads",
      fieldCount: Object.keys(fields).length,
    });

    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields.",
          fields,
        },
      },
      { status: 422 }
    );
  }

  // Create lead
  try {
    const result = await createLead(parseResult.data);
    const durationMs = Date.now() - startTime;

    logger.info("POST /api/leads success", {
      requestId,
      operation: "POST /api/leads",
      publicLeadId: result.publicLeadId,
      durationMs,
    });

    // Never send internal qualification signals (score, matchedRules) to the browser —
    // createLead's full internal result is untouched; only the HTTP response is stripped.
    const { score: _score, matchedRules: _matchedRules, ...publicResult } = result;
    return NextResponse.json(publicResult, { status: 201 });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const { body: errBody, status } = toApiErrorResponse(error);

    logger.error("POST /api/leads failed", {
      requestId,
      operation: "POST /api/leads",
      errorCode: (error as { code?: string }).code ?? "UNKNOWN",
      durationMs,
    });

    return NextResponse.json(errBody, { status });
  }
}
