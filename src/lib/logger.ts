/**
 * Lightweight structured logger.
 * Outputs JSON in production, pretty-printed in development.
 * For production at scale, swap with pino or winston.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const { level, msg, ts, ...rest } = entry;
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `[${ts}] ${level.toUpperCase()} ${msg}${extra}`;
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...meta,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
