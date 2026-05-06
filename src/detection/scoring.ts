import type { RuleMatch, Confidence, NegativeSignal } from "../types/index.js";
import {
  PLACEHOLDER_PATTERNS,
  KNOWN_SAFE_PATTERNS,
  TEST_FILE_PATTERNS,
  COMMENT_PREFIXES,
  NEGATIVE_WEIGHTS,
  DEFAULT_ENTROPY_MIN,
  DEFAULT_SCORE_HIGH,
  DEFAULT_SCORE_MEDIUM,
  MAX_SCORE,
} from "../utils/constants.js";

// ─── Negative Signal Detection ───────────────────────────────

/**
 * Check if a value is a placeholder (e.g. "YOUR_API_KEY_HERE").
 */
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

/**
 * Check if a value matches known safe patterns (localhost, etc.).
 */
export function isKnownSafe(value: string): boolean {
  return KNOWN_SAFE_PATTERNS.some((p) => p.test(value));
}

/**
 * Check if a file path is a test/example file.
 */
export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}

/**
 * Check if a line is a comment.
 */
export function isComment(line: string): boolean {
  const trimmed = line.trim();
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

// ─── Score Calculation ───────────────────────────────────────

export interface ScoreInput {
  matches: RuleMatch[];
  entropy: number;
  entropyThreshold?: number;
  filePath: string;
  rawLine: string;
  value: string;
}

export interface ScoreResult {
  score: number;
  confidence: Confidence;
  negativeSignals: NegativeSignal[];
  skip: boolean; // true if should be completely ignored
}

/**
 * Calculate final score for a finding.
 * Combines positive signals (rule matches) with negative signals.
 */
export function calculateScore(input: ScoreInput): ScoreResult {
  const {
    matches,
    entropy,
    entropyThreshold = DEFAULT_ENTROPY_MIN,
    filePath,
    rawLine,
    value,
  } = input;

  const negativeSignals: NegativeSignal[] = [];

  // Check known safe → skip entirely
  if (isKnownSafe(value)) {
    return { score: 0, confidence: "low", negativeSignals: [], skip: true };
  }

  // Positive score from rule matches
  let score = 0;
  for (const match of matches) {
    score += match.score;
  }

  // Entropy bonus (if entropy is high and any rule has entropy weight)
  if (entropy >= entropyThreshold) {
    // Find max entropy weight from matching rules
    // For generic rules this is important
    const maxEntropyWeight = Math.max(
      ...matches.map((m) => {
        // We don't have the rule object here, but generic rules set score differently
        // Add a base entropy bonus
        return 0;
      }),
      0,
    );
    // Base entropy bonus for high-entropy values
    if (score > 0) {
      score += 10;
    }
  }

  // Negative signals
  if (isPlaceholder(value)) {
    negativeSignals.push({ type: "placeholder", weight: NEGATIVE_WEIGHTS.placeholder });
    score += NEGATIVE_WEIGHTS.placeholder;
  }

  if (isTestFile(filePath)) {
    negativeSignals.push({ type: "test_file", weight: NEGATIVE_WEIGHTS.testFile });
    score += NEGATIVE_WEIGHTS.testFile;
  }

  if (isComment(rawLine)) {
    negativeSignals.push({ type: "comment", weight: NEGATIVE_WEIGHTS.comment });
    score += NEGATIVE_WEIGHTS.comment;
  }

  if (entropy < entropyThreshold && entropy > 0) {
    negativeSignals.push({ type: "low_entropy", weight: NEGATIVE_WEIGHTS.lowEntropy });
    score += NEGATIVE_WEIGHTS.lowEntropy;
  }

  // Clamp score
  score = Math.max(0, Math.min(MAX_SCORE, score));

  return {
    score,
    confidence: assignConfidence(score),
    negativeSignals,
    skip: false,
  };
}

/**
 * Map score to confidence level.
 */
export function assignConfidence(
  score: number,
  highThreshold: number = DEFAULT_SCORE_HIGH,
  mediumThreshold: number = DEFAULT_SCORE_MEDIUM,
): Confidence {
  if (score > highThreshold) return "high";
  if (score >= mediumThreshold) return "medium";
  return "low";
}
