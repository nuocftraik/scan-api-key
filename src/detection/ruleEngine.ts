import type { Rule, Candidate, RuleMatch, RuleMatchSignals } from "../types/index.js";

/**
 * Apply all rules to a candidate and return matches.
 */
export function applyRules(
  candidate: Candidate,
  rules: Rule[],
  hasContextMatch: boolean,
): RuleMatch[] {
  const matches: RuleMatch[] = [];

  for (const rule of rules) {
    // Check file filtering
    // (skipped in MVP — will be implemented with config system)

    const signals = matchRule(rule, candidate, hasContextMatch);

    // If the rule specifies a valuePattern, it MUST match the value to be considered a valid provider key
    if (rule.valuePattern && !signals.valueMatch) {
      continue;
    }

    // Only create a match if at least valueMatch or keyMatch fired
    // Context alone is not enough to trigger a specific rule
    if (!signals.valueMatch && !signals.keyMatch) {
      continue;
    }

    const score = calculateRuleScore(rule, signals);

    matches.push({
      ruleId: rule.id,
      provider: rule.provider,
      signals,
      score,
    });
  }

  return matches;
}

/**
 * Check a single rule against a candidate.
 */
function matchRule(
  rule: Rule,
  candidate: Candidate,
  hasContextMatch: boolean,
): RuleMatchSignals {
  let valueMatch = false;
  let keyMatch = false;

  // Value pattern match
  if (rule.valuePattern) {
    valueMatch = rule.valuePattern.test(candidate.value);
  }

  // Key pattern match
  if (rule.keyPattern && candidate.keyName) {
    keyMatch = rule.keyPattern.test(candidate.keyName);
  }

  return {
    valueMatch,
    keyMatch,
    contextMatch: hasContextMatch,
    entropy: 0, // entropy is added externally by scoring
  };
}

/**
 * Calculate score contribution from a single rule match.
 */
function calculateRuleScore(rule: Rule, signals: RuleMatchSignals): number {
  let score = 0;

  if (signals.valueMatch) score += rule.weight.valueMatch;
  if (signals.keyMatch) score += (rule.weight.keyMatch ?? 0);
  if (signals.contextMatch) score += (rule.weight.contextMatch ?? 0);

  return score;
}
