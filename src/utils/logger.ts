type LogLevel = "info" | "warn" | "error" | "debug";

let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const prefix = {
    info: "ℹ️ ",
    warn: "⚠️ ",
    error: "❌",
    debug: "🔧",
  }[level];

  if (level === "debug" && !debugEnabled) return;

  const fn = level === "error" ? console.error : console.log;
  fn(`${prefix} ${message}`, ...args);
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => log("info", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log("warn", msg, ...args),
  error: (msg: string, ...args: unknown[]) => log("error", msg, ...args),
  debug: (msg: string, ...args: unknown[]) => log("debug", msg, ...args),
};
