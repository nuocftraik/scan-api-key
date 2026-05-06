import type { Candidate } from "../types/index.js";

/**
 * Extract candidate secret values from a single source line.
 *
 * Strategies:
 * 1. Assignment: `key = "value"` or `key: "value"`
 * 2. Standalone quoted strings that look like tokens
 *
 * Returns all candidates found on this line.
 */
export function extractCandidates(
  line: string,
  lineNumber: number,
): Candidate[] {
  const candidates: Candidate[] = [];
  const trimmed = line.trim();

  // Skip empty lines
  if (!trimmed) return candidates;

  // Strategy 1: Assignment patterns (key = value, key: value)
  const assignmentCandidates = extractFromAssignment(trimmed, lineNumber, line);
  candidates.push(...assignmentCandidates);

  // Strategy 2: Standalone quoted strings (if no assignment found)
  if (candidates.length === 0) {
    const quotedCandidates = extractQuotedStrings(trimmed, lineNumber, line);
    candidates.push(...quotedCandidates);
  }

  return candidates;
}

/**
 * Extract from assignment patterns:
 * - const KEY = "value"
 * - KEY=value
 * - "key": "value"
 * - key: "value"
 */
function extractFromAssignment(
  trimmed: string,
  lineNumber: number,
  rawLine: string,
): Candidate[] {
  const candidates: Candidate[] = [];

  // Pattern: KEY=VALUE (env file style, no spaces around =)
  const envMatch = trimmed.match(
    /^([A-Z][A-Z0-9_]*)\s*=\s*["']?([^"'\s#][^"'\n#]*)["']?\s*(?:#.*)?$/,
  );
  if (envMatch) {
    const value = envMatch[2].trim();
    if (value.length >= 8) {
      candidates.push({
        value,
        keyName: envMatch[1],
        lineNumber,
        rawLine,
      });
    }
    return candidates;
  }

  // Pattern: const/let/var/export KEY = "value"
  const jsAssignMatch = trimmed.match(
    /(?:const|let|var|export)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*["'`]([^"'`]+)["'`]/,
  );
  if (jsAssignMatch) {
    const value = jsAssignMatch[2];
    if (value.length >= 8) {
      candidates.push({
        value,
        keyName: jsAssignMatch[1],
        lineNumber,
        rawLine,
      });
    }
    return candidates;
  }

  // Pattern: "key": "value" (JSON style) or key: "value" (YAML/object)
  const kvMatch = trimmed.match(
    /["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*[:=]\s*["'`]([^"'`]+)["'`]/,
  );
  if (kvMatch) {
    const value = kvMatch[2];
    if (value.length >= 8) {
      candidates.push({
        value,
        keyName: kvMatch[1],
        lineNumber,
        rawLine,
      });
    }
    return candidates;
  }

  return candidates;
}

/**
 * Extract standalone quoted strings that might be tokens/keys.
 * Used as fallback when no assignment pattern is found.
 */
function extractQuotedStrings(
  trimmed: string,
  lineNumber: number,
  rawLine: string,
): Candidate[] {
  const candidates: Candidate[] = [];
  const quoteRegex = /["'`]([A-Za-z0-9_\-./+=]{16,})["'`]/g;

  let match;
  while ((match = quoteRegex.exec(trimmed)) !== null) {
    candidates.push({
      value: match[1],
      lineNumber,
      rawLine,
    });
  }

  return candidates;
}
