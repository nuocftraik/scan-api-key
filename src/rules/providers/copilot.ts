import type { Rule } from "../../types/index.js";

export const copilotRules: Rule[] = [
  {
    id: "github-copilot-token",
    name: "GitHub Copilot Token",
    provider: "copilot",
    valuePattern: /gh[uop]_[A-Za-z0-9]{36}/,
    keyPattern: /COPILOT_TOKEN|COPILOT_API_KEY|GITHUB_COPILOT/i,
    weight: { valueMatch: 50, keyMatch: 30, contextMatch: 10 },
    severity: "high",
    tags: ["ai", "copilot"],
  },
];
