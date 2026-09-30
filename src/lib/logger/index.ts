/**
 * MuggedMoments — Structured Logger
 *
 * Development: verbose JSON logging to console
 * Production: controlled — do not log PII, credentials, or secrets
 *
 * NEVER LOG:
 * - full phone numbers (log only last 4 digits if needed)
 * - authentication secrets
 * - full payment data
 * - unnecessary personal information
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  leadId?: string;
  automationType?: string;
  operation?: string;
  status?: string;
  durationMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function createEntry(
  level: LogLevel,
  message: string,
  context: Partial<Omit<LogEntry, "timestamp" | "level" | "message">> = {}
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
}

function output(entry: LogEntry): void {
  const str = JSON.stringify(entry);
  if (entry.level === "error" || entry.level === "warn") {
    console.error(str);
  } else if (!isProduction() || entry.level !== "debug") {
    console.log(str);
  }
}

export const logger = {
  debug(
    message: string,
    context: Partial<Omit<LogEntry, "timestamp" | "level" | "message">> = {}
  ) {
    if (!isProduction()) {
      output(createEntry("debug", message, context));
    }
  },
  info(
    message: string,
    context: Partial<Omit<LogEntry, "timestamp" | "level" | "message">> = {}
  ) {
    output(createEntry("info", message, context));
  },
  warn(
    message: string,
    context: Partial<Omit<LogEntry, "timestamp" | "level" | "message">> = {}
  ) {
    output(createEntry("warn", message, context));
  },
  error(
    message: string,
    context: Partial<Omit<LogEntry, "timestamp" | "level" | "message">> = {}
  ) {
    output(createEntry("error", message, context));
  },
};
