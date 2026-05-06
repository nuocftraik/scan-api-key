import { describe, it, expect } from "vitest";
import { applyRules } from "../../src/detection/ruleEngine.js";
import { getBuiltinRules } from "../../src/rules/index.js";
import type { Candidate } from "../../src/types/index.js";

const rules = getBuiltinRules();

describe("applyRules", () => {
  it("should match OpenAI project key by value", () => {
    const candidate: Candidate = {
      value: "sk-proj-fakeKey1234567890abcdefghij",
      keyName: "API_KEY",
      lineNumber: 1,
      rawLine: 'const API_KEY = "sk-proj-fakeKey1234567890abcdefghij"',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.provider === "openai")).toBe(true);
    expect(matches.some((m) => m.signals.valueMatch)).toBe(true);
  });

  it("should match OpenAI key + keyPattern for high score", () => {
    const candidate: Candidate = {
      value: "sk-proj-fakeKey1234567890abcdefghij",
      keyName: "OPENAI_API_KEY",
      lineNumber: 1,
      rawLine: 'const OPENAI_API_KEY = "sk-proj-fakeKey1234567890abcdefghij"',
    };
    const matches = applyRules(candidate, rules, false);
    const openaiMatch = matches.find((m) => m.ruleId === "openai-project-key");
    expect(openaiMatch).toBeDefined();
    expect(openaiMatch!.signals.valueMatch).toBe(true);
    expect(openaiMatch!.signals.keyMatch).toBe(true);
    expect(openaiMatch!.score).toBeGreaterThanOrEqual(85);
  });

  it("should match Anthropic key", () => {
    const candidate: Candidate = {
      value: "sk-ant-api03-fakeAnthropic1234567890abcdefg",
      lineNumber: 1,
      rawLine: 'key = "sk-ant-api03-fakeAnthropic1234567890abcdefg"',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches.some((m) => m.provider === "anthropic")).toBe(true);
  });

  it("should match Google/Gemini key", () => {
    const candidate: Candidate = {
      value: "AIzaSyFakeGoogleKey1234567890abcdefghi",
      keyName: "GOOGLE_API_KEY",
      lineNumber: 1,
      rawLine: 'GOOGLE_API_KEY=AIzaSyFakeGoogleKey1234567890abcdefghi',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches.some((m) => m.provider === "google")).toBe(true);
  });

  it("should match AWS access key", () => {
    const candidate: Candidate = {
      value: "AKIAIOSFODNN7EXAMPLE",
      keyName: "AWS_ACCESS_KEY_ID",
      lineNumber: 1,
      rawLine: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches.some((m) => m.provider === "aws")).toBe(true);
  });

  it("should match GitHub PAT", () => {
    const candidate: Candidate = {
      value: "ghp_fakeGitHubToken1234567890abcdefghijklmn",
      lineNumber: 1,
      rawLine: 'token = "ghp_fakeGitHubToken1234567890abcdefghijklmn"',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches.some((m) => m.provider === "github")).toBe(true);
  });

  it("should match generic key by keyName only", () => {
    const candidate: Candidate = {
      value: "someRandomValue1234567890",
      keyName: "SECRET_KEY",
      lineNumber: 1,
      rawLine: 'const SECRET_KEY = "someRandomValue1234567890"',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches.some((m) => m.provider === "generic")).toBe(true);
    const genericMatch = matches.find((m) => m.provider === "generic");
    expect(genericMatch!.signals.keyMatch).toBe(true);
    expect(genericMatch!.signals.valueMatch).toBe(false);
  });

  it("should NOT match clean values", () => {
    const candidate: Candidate = {
      value: "Hello World This Is Clean",
      keyName: "greeting",
      lineNumber: 1,
      rawLine: 'const greeting = "Hello World This Is Clean"',
    };
    const matches = applyRules(candidate, rules, false);
    expect(matches).toHaveLength(0);
  });

  it("should add context score when context matches", () => {
    const candidate: Candidate = {
      value: "sk-proj-fakeKey1234567890abcdefghij",
      lineNumber: 1,
      rawLine: 'const key = "sk-proj-fakeKey1234567890abcdefghij"',
    };
    const withoutCtx = applyRules(candidate, rules, false);
    const withCtx = applyRules(candidate, rules, true);

    const scoreWithout = withoutCtx.find((m) => m.ruleId === "openai-project-key")!.score;
    const scoreWith = withCtx.find((m) => m.ruleId === "openai-project-key")!.score;
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });
});
