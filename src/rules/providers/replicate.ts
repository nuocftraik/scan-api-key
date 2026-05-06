import type { Rule } from "../../types/index.js";

export const replicateRules: Rule[] = [
  {
    id: "replicate-token",
    name: "Replicate API Token",
    provider: "replicate",
    valuePattern: /r8_[A-Za-z0-9]{37}/,
    keyPattern: /REPLICATE_API_TOKEN|REPLICATE_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["ai"],
  },
];
