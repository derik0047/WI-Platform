/**
 * Minimal structured logger for the platform.
 * Pretty console output in development; single-line JSON in production
 * (Vercel/Log-drain friendly). Swap the sink here to plug in an external service.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isProd = process.env.NODE_ENV === "production";
const minLevel: LogLevel = isProd ? "info" : "debug";

function shouldLog(level: LogLevel) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[minLevel];
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;

  const record = {
    level,
    time: new Date().toISOString(),
    message,
    ...context,
  };

  const line = isProd ? JSON.stringify(record) : `[${level}] ${message}`;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (isProd) sink(line);
  else sink(line, context ?? "");
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
  /** Attach a fixed context to every subsequent call (e.g. requestId, userId). */
  child: (base: LogContext) => ({
    debug: (m: string, c?: LogContext) => emit("debug", m, { ...base, ...c }),
    info: (m: string, c?: LogContext) => emit("info", m, { ...base, ...c }),
    warn: (m: string, c?: LogContext) => emit("warn", m, { ...base, ...c }),
    error: (m: string, c?: LogContext) => emit("error", m, { ...base, ...c }),
  }),
};

export type Logger = typeof logger;
