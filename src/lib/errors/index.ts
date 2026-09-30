/**
 * MuggedMoments — Structured Error System
 *
 * Internal error types never exposed directly to users.
 * User-facing errors are always sanitized.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "DUPLICATE_SUBMISSION"
  | "INVALID_EVENT_TYPE"
  | "INVALID_SERVICE"
  | "IDEMPOTENCY_CONFLICT"
  | "LEAD_NOT_FOUND"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "PHONE_ALREADY_REGISTERED"
  | "VENDOR_NOT_FOUND"
  | "UNAUTHORIZED"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "PORTFOLIO_LIMIT_REACHED"
  | "PORTFOLIO_ITEM_NOT_FOUND"
  | "OPPORTUNITY_NOT_FOUND"
  | "INVALID_OPPORTUNITY_TRANSITION"
  | "OPPORTUNITY_EXPIRED"
  | "QUOTE_NOT_FOUND"
  | "QUOTE_VALIDATION_FAILED"
  | "QUOTE_ALREADY_SUBMITTED"
  | "QUOTE_REVISION_IN_PROGRESS"
  | "QUOTE_VERSION_MISMATCH"
  | "BOOKING_REQUEST_ALREADY_ACTIVE"
  | "BOOKING_REQUEST_NOT_FOUND"
  | "INVALID_BOOKING_REQUEST_TRANSITION"
  | "BOOKING_REQUEST_EXPIRED"
  | "MISSING_EVENT_DATE"
  | "DATE_ALREADY_BOOKED"
  | "BOOKING_NOT_FOUND";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super("VALIDATION_ERROR", message, fields, 422);
  }
}

export class DuplicateSubmissionError extends AppError {
  constructor() {
    super(
      "DUPLICATE_SUBMISSION",
      "This submission has already been received.",
      undefined,
      409
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("LEAD_NOT_FOUND", `${resource} not found.`, undefined, 404);
  }
}

/**
 * Converts internal AppError to a safe user-facing response.
 * Never exposes stack traces, internal codes beyond the error code,
 * or sensitive data.
 */
export function toApiErrorResponse(error: unknown): {
  body: object;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
    };
  }

  // Unknown error — do not leak internals
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    },
  };
}
