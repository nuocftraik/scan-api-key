import { describe, it, expect } from "vitest";
import {
  calculateScore,
  isPlaceholder,
  isTestFile,
  isComment,
  isKnownSafe,
  assignConfidence,
} from "../../src/detection/scoring.js";
import type { RuleMatch } from "../../src/types/index.js";

describe("isPlaceholder", () => {
  it("should detect YOUR_API_KEY", () => expect(isPlaceholder("YOUR_API_KEY")).toBe(true));
  it("should detect API_KEY_HERE", () => expect(isPlaceholder("API_KEY_HERE")).toBe(true));
  it("should detect REPLACE_ME", () => expect(isPlaceholder("REPLACE_ME")).toBe(true));
  it("should detect xxx", () => expect(isPlaceholder("xxx")).toBe(true));
  it("should detect dummy", () => expect(isPlaceholder("dummy_value")).toBe(true));
  it("should detect <YOUR_KEY>", () => expect(isPlaceholder("<YOUR_KEY>")).toBe(true));
  it("should NOT flag real keys", () => expect(isPlaceholder("sk-proj-real123")).toBe(false));
});

describe("isKnownSafe", () => {
  it("should detect localhost", () => expect(isKnownSafe("localhost")).toBe(true));
  it("should detect 127.0.0.1", () => expect(isKnownSafe("127.0.0.1")).toBe(true));
  it("should detect pure numbers", () => expect(isKnownSafe("12345")).toBe(true));
  it("should NOT flag real values", () => expect(isKnownSafe("sk-proj-abc")).toBe(false));
});

describe("isTestFile", () => {
  it("should detect /test/ path", () => expect(isTestFile("src/test/config.js")).toBe(true));
  it("should detect __tests__", () => expect(isTestFile("src/__tests__/util.ts")).toBe(true));
  it("should detect .test.ts", () => expect(isTestFile("utils.test.ts")).toBe(true));
  it("should detect /example/", () => expect(isTestFile("docs/example/config.js")).toBe(true));
  it("should NOT flag src files", () => expect(isTestFile("src/config.ts")).toBe(false));
});

describe("isComment", () => {
  it("should detect // comment", () => expect(isComment("  // some comment")).toBe(true));
  it("should detect # comment", () => expect(isComment("# comment")).toBe(true));
  it("should detect /* comment", () => expect(isComment("  /* block comment")).toBe(true));
  it("should NOT flag code", () => expect(isComment('const x = "value"')).toBe(false));
});

describe("assignConfidence", () => {
  it("score >80 → high", () => expect(assignConfidence(85)).toBe("high"));
  it("score 50-80 → medium", () => expect(assignConfidence(65)).toBe("medium"));
  it("score <50 → low", () => expect(assignConfidence(30)).toBe("low"));
  it("score exactly 80 → medium", () => expect(assignConfidence(80)).toBe("medium"));
  it("score exactly 50 → medium", () => expect(assignConfidence(50)).toBe("medium"));
});

describe("calculateScore", () => {
  const makeMatch = (score: number, provider = "openai"): RuleMatch => ({
    ruleId: "test-rule",
    provider,
    signals: { valueMatch: true, keyMatch: true, contextMatch: false, entropy: 0 },
    score,
  });

  it("should sum positive signals", () => {
    const result = calculateScore({
      matches: [makeMatch(85)],
      entropy: 4.5,
      filePath: "src/config.js",
      rawLine: 'const key = "sk-proj-abc123"',
      value: "sk-proj-abc123",
    });
    expect(result.score).toBeGreaterThan(80);
    expect(result.confidence).toBe("high");
    expect(result.skip).toBe(false);
  });

  it("should reduce score for placeholders", () => {
    const result = calculateScore({
      matches: [makeMatch(60)],
      entropy: 3.0,
      filePath: "src/config.js",
      rawLine: 'const key = "YOUR_API_KEY_HERE"',
      value: "YOUR_API_KEY_HERE",
    });
    expect(result.score).toBeLessThan(30);
    expect(result.negativeSignals.some((s) => s.type === "placeholder")).toBe(true);
  });

  it("should reduce score for test files", () => {
    const result = calculateScore({
      matches: [makeMatch(60)],
      entropy: 4.5,
      filePath: "src/__tests__/config.test.js",
      rawLine: 'const key = "sk-proj-abc123"',
      value: "sk-proj-abc123",
    });
    expect(result.negativeSignals.some((s) => s.type === "test_file")).toBe(true);
    expect(result.score).toBeLessThan(60);
  });

  it("should skip known safe values", () => {
    const result = calculateScore({
      matches: [makeMatch(60)],
      entropy: 0,
      filePath: "src/config.js",
      rawLine: 'const host = "localhost"',
      value: "localhost",
    });
    expect(result.skip).toBe(true);
    expect(result.score).toBe(0);
  });

  it("should cap score at 100", () => {
    const result = calculateScore({
      matches: [makeMatch(90), makeMatch(80)],
      entropy: 5.0,
      filePath: "src/config.js",
      rawLine: 'const key = "sk-proj-abc123"',
      value: "sk-proj-abc123",
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should floor score at 0", () => {
    const result = calculateScore({
      matches: [makeMatch(10)],
      entropy: 1.0,
      filePath: "src/__tests__/test.js",
      rawLine: '// YOUR_API_KEY_HERE',
      value: "YOUR_API_KEY_HERE",
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
