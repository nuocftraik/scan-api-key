import type { Rule } from "../../types/index.js";

export const anthropicRules: Rule[] = [
  {
    id: "anthropic-key",
    name: "Anthropic API Key",
    provider: "anthropic",
    valuePattern: /sk-ant-api\d{2}-[A-Za-z0-9_-]{60,}/,
    keyPattern: /ANTHROPIC_API_KEY|CLAUDE_API_KEY|ANTHROPIC_AUTH_TOKEN/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"],
  },
];
