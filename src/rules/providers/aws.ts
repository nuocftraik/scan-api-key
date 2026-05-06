import type { Rule } from "../../types/index.js";

export const awsRules: Rule[] = [
  {
    id: "aws-access-key",
    name: "AWS Access Key ID",
    provider: "aws",
    valuePattern: /AKIA[0-9A-Z]{16}/,
    keyPattern: /AWS_ACCESS_KEY_ID/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["cloud"],
  },
  {
    id: "aws-secret-key",
    name: "AWS Secret Access Key",
    provider: "aws",
    valuePattern: /[A-Za-z0-9/+=]{40}/,
    keyPattern: /AWS_SECRET_ACCESS_KEY/i,
    weight: { valueMatch: 40, keyMatch: 30, contextMatch: 15 },
    severity: "critical",
    tags: ["cloud"],
  },
];
