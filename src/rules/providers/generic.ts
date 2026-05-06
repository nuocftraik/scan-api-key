import type { Rule } from "../../types/index.js";

/**
 * Generic rules — only keyPattern, no valuePattern.
 * These rely heavily on entropy + context for confidence.
 */
export const genericRules: Rule[] = [
  {
    id: "generic-api-key",
    name: "Generic API Key",
    provider: "generic",
    keyPattern: /API_KEY|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|BEARER_TOKEN|CLIENT_SECRET|PRIVATE_KEY/i,
    weight: { valueMatch: 0, keyMatch: 25, contextMatch: 15, entropy: 20 },
    severity: "medium",
    tags: ["generic"],
  },
];
