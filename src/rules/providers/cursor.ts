import type { Rule } from "../../types/index.js";

export const cursorRules: Rule[] = [
  {
    id: "cursor-api-key",
    name: "Cursor API Key",
    provider: "cursor",
    valuePattern: /sk_cursor_[A-Za-z0-9_-]{20,}/,
    keyPattern: /CURSOR_API_KEY|CURSOR_SESSION_TOKEN/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["ai", "ide"],
  },
];
