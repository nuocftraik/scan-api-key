import type { Rule } from "../../types/index.js";

export const slackRules: Rule[] = [
  {
    id: "slack-bot-token",
    name: "Slack Bot Token",
    provider: "slack",
    valuePattern: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}/,
    weight: { valueMatch: 80, keyMatch: 10, contextMatch: 10 },
    severity: "high",
    tags: ["social"],
  },
  {
    id: "slack-user-token",
    name: "Slack User Token",
    provider: "slack",
    valuePattern: /xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}/,
    weight: { valueMatch: 80, keyMatch: 10, contextMatch: 10 },
    severity: "critical",
    tags: ["social"],
  }
];
