import type { Rule } from "../../types/index.js";

export const huggingfaceRules: Rule[] = [
  {
    id: "huggingface-token",
    name: "Hugging Face API Token",
    provider: "huggingface",
    valuePattern: /hf_[A-Za-z0-9]{34}/,
    keyPattern: /HF_TOKEN|HUGGINGFACE_API_KEY|HUGGING_FACE_TOKEN/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["ai"],
  },
];
