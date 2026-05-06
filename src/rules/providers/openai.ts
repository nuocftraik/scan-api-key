import type { Rule } from "../../types/index.js";

export const openaiRules: Rule[] = [
  {
    id: "openai-key",
    name: "OpenAI API Key",
    provider: "openai",
    valuePattern: /sk-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CHATGPT_API_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"],
  },
  {
    id: "openai-project-key",
    name: "OpenAI Project Key",
    provider: "openai",
    valuePattern: /sk-proj-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CHATGPT_API_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"],
  },
  {
    id: "openai-service-key",
    name: "OpenAI Service Key",
    provider: "openai",
    valuePattern: /sk-svc-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"],
  },
  {
    id: "openai-org-key",
    name: "OpenAI Organization Key",
    provider: "openai",
    valuePattern: /sk-org-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"],
  },
];
