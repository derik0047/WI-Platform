import { logger } from "@/lib/logger";

/**
 * Typed application errors. Throw these in server code; the boundaries
 * (error.tsx, route handlers, server actions) can branch on `.code`/`.status`.
 */

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? statusFor(code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated") {
    super("UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Not allowed") {
    super("FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input", cause?: unknown) {
    super("VALIDATION", message, { cause });
  }
}

function statusFor(code: ErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION":
      return 422;
    case "CONFLICT":
      return 409;
    case "RATE_LIMIT":
      return 429;
    case "INTERNAL":
      return 500;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Normalise any thrown value to an AppError and log it. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  const message = error instanceof Error ? error.message : "Unexpected error";
  const appError = new AppError("INTERNAL", message, { cause: error });
  logger.error("Unhandled error normalised to AppError", {
    message,
    cause: error instanceof Error ? error.stack : String(error),
  });
  return appError;
}
