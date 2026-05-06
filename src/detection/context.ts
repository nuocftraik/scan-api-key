import { DEFAULT_CONTEXT_PATTERNS } from "../utils/constants.js";

/**
 * Analyze surrounding lines for context signals.
 * Checks ±3 lines from the target for auth-related patterns.
 */
export function analyzeContext(
  lines: string[],
  targetLineIndex: number,
  patterns: RegExp[] = DEFAULT_CONTEXT_PATTERNS,
): boolean {
  const radius = 3;
  const start = Math.max(0, targetLineIndex - radius);
  const end = Math.min(lines.length - 1, targetLineIndex + radius);

  for (let i = start; i <= end; i++) {
    if (i === targetLineIndex) continue; // skip the target line itself
    const line = lines[i];
    for (const pattern of patterns) {
      if (pattern.test(line)) return true;
    }
  }

  return false;
}
