import type { Rule } from "../../types/index.js";

export const githubRules: Rule[] = [
  {
    id: "github-pat",
    name: "GitHub Personal Access Token",
    provider: "github",
    valuePattern: /ghp_[A-Za-z0-9]{36}/,
    keyPattern: /GITHUB_TOKEN|GH_TOKEN|GITHUB_PAT/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["vcs"],
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth Token",
    provider: "github",
    valuePattern: /gho_[A-Za-z0-9]{36}/,
    weight: { valueMatch: 60, keyMatch: 20, contextMatch: 15 },
    severity: "high",
    tags: ["vcs"],
  },
  {
    id: "github-app",
    name: "GitHub App Token",
    provider: "github",
    valuePattern: /ghu_[A-Za-z0-9]{36}/,
    weight: { valueMatch: 60, keyMatch: 20, contextMatch: 15 },
    severity: "high",
    tags: ["vcs"],
  },
];
