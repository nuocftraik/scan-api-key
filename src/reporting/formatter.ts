import type { MaskingMode } from "../types/index.js";

/**
 * Mask a secret value for safe display.
 *
 * Modes:
 * - partial: show prefix (4-6 chars) + **** + suffix (2-4 chars)
 * - full: ****
 * - none: raw value (explicit opt-in only)
 */
export function maskValue(value: string, mode: MaskingMode = "partial"): string {
  if (mode === "none") return value;
  if (mode === "full") return "****";

  // partial mode
  if (value.length <= 8) return "****";

  const prefixLen = Math.min(6, Math.floor(value.length * 0.2));
  const suffixLen = Math.min(4, Math.floor(value.length * 0.1));

  const prefix = value.slice(0, Math.max(4, prefixLen));
  const suffix = value.slice(-Math.max(2, suffixLen));

  return `${prefix}****${suffix}`;
}

// ─── Colors (ANSI) ───────────────────────────────────────────

const COLORS = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
} as const;

export function red(text: string): string {
  return `${COLORS.red}${text}${COLORS.reset}`;
}
export function yellow(text: string): string {
  return `${COLORS.yellow}${text}${COLORS.reset}`;
}
export function green(text: string): string {
  return `${COLORS.green}${text}${COLORS.reset}`;
}
export function blue(text: string): string {
  return `${COLORS.blue}${text}${COLORS.reset}`;
}
export function gray(text: string): string {
  return `${COLORS.gray}${text}${COLORS.reset}`;
}
export function bold(text: string): string {
  return `${COLORS.bold}${text}${COLORS.reset}`;
}
export function dim(text: string): string {
  return `${COLORS.dim}${text}${COLORS.reset}`;
}
