import type { Rule } from "../../types/index.js";

export const stripeRules: Rule[] = [
  {
    id: "stripe-live-key",
    name: "Stripe Live Secret Key",
    provider: "stripe",
    valuePattern: /sk_live_[0-9a-zA-Z]{24,}/,
    keyPattern: /STRIPE_SECRET_KEY|STRIPE_API_KEY/i,
    weight: { valueMatch: 80, keyMatch: 20, contextMatch: 0 },
    severity: "critical",
    tags: ["payment"],
  },
  {
    id: "stripe-test-key",
    name: "Stripe Test Secret Key",
    provider: "stripe",
    valuePattern: /sk_test_[0-9a-zA-Z]{24,}/,
    weight: { valueMatch: 60, keyMatch: 20, contextMatch: 0 },
    severity: "medium",
    tags: ["payment"],
  }
];
