import type { Rule } from "../../types/index.js";

export const googleRules: Rule[] = [
  {
    id: "gemini-api-key",
    name: "Gemini API Key",
    provider: "gemini",
    valuePattern: /AIzaSy[A-Za-z0-9_-]{33}/,
    keyPattern: /GEMINI_API_KEY|GOOGLE_AI_API_KEY|MAKERSUITE_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"],
  },
  {
    id: "google-api-key",
    name: "Google Cloud API Key",
    provider: "google",
    valuePattern: /AIzaSy[A-Za-z0-9_-]{33}/,
    keyPattern: /GOOGLE_API_KEY|GCP_KEY|YOUTUBE_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["cloud"],
  },
];
