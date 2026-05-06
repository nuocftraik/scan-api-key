import type { Rule } from "../types/index.js";
import { openaiRules } from "./providers/openai.js";
import { anthropicRules } from "./providers/anthropic.js";
import { googleRules } from "./providers/google.js";
import { awsRules } from "./providers/aws.js";
import { githubRules } from "./providers/github.js";
import { huggingfaceRules } from "./providers/huggingface.js";
import { replicateRules } from "./providers/replicate.js";
import { genericRules } from "./providers/generic.js";
import { stripeRules } from "./providers/stripe.js";
import { slackRules } from "./providers/slack.js";
import { copilotRules } from "./providers/copilot.js";
import { cursorRules } from "./providers/cursor.js";

/**
 * Registry of all built-in rules, ordered by specificity.
 * More specific rules (with valuePattern) come first.
 */
export function getBuiltinRules(): Rule[] {
  return [
    // Specific providers (have valuePattern → higher confidence)
    ...openaiRules,
    ...anthropicRules,
    ...googleRules,
    ...awsRules,
    ...githubRules,
    ...huggingfaceRules,
    ...replicateRules,
    ...stripeRules,
    ...slackRules,
    ...copilotRules,
    ...cursorRules,

    // Generic (no valuePattern → lower confidence)
    ...genericRules,
  ];
}

/**
 * Get unique provider names from rules.
 */
export function getProviderNames(): string[] {
  const rules = getBuiltinRules();
  return [...new Set(rules.map((r) => r.provider))];
}
