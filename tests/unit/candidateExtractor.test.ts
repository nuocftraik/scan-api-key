import { describe, it, expect } from "vitest";
import { extractCandidates } from "../../src/core/candidateExtractor.js";

describe("extractCandidates", () => {
  describe("env file style (KEY=VALUE)", () => {
    it("should extract from env assignment", () => {
      const result = extractCandidates('OPENAI_API_KEY=sk-proj-fakeKey1234567890', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("sk-proj-fakeKey1234567890");
      expect(result[0].keyName).toBe("OPENAI_API_KEY");
    });

    it("should extract from quoted env value", () => {
      const result = extractCandidates('API_KEY="sk-ant-api03-testvalue123456"', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("sk-ant-api03-testvalue123456");
    });

    it("should ignore short values", () => {
      const result = extractCandidates('KEY=short', 1);
      expect(result).toHaveLength(0);
    });
  });

  describe("JS/TS assignment (const KEY = value)", () => {
    it("should extract from const assignment", () => {
      const result = extractCandidates('const API_KEY = "AIzaSyFakeGoogleKey123456789"', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("AIzaSyFakeGoogleKey123456789");
      expect(result[0].keyName).toBe("API_KEY");
    });

    it("should extract from let assignment", () => {
      const result = extractCandidates("let token = 'ghp_fakeGitHubToken1234567890abc'", 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("ghp_fakeGitHubToken1234567890abc");
    });

    it("should extract from template literal", () => {
      const result = extractCandidates('const key = `sk-proj-templateKey12345678`', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("sk-proj-templateKey12345678");
    });
  });

  describe("JSON/object style (key: value)", () => {
    it("should extract from JSON object", () => {
      const result = extractCandidates('"apiKey": "AKIAIOSFODNN7EXAMPLE1"', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("AKIAIOSFODNN7EXAMPLE1");
    });

    it("should extract from object literal", () => {
      const result = extractCandidates('  apiKey: "hf_fakeHuggingFaceToken123456"', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("hf_fakeHuggingFaceToken123456");
    });
  });

  describe("standalone quoted strings", () => {
    it("should extract long standalone strings", () => {
      const result = extractCandidates('  "sk-proj-standaloneValue1234567890abcdef"', 1);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("sk-proj-standaloneValue1234567890abcdef");
    });

    it("should NOT extract short strings", () => {
      const result = extractCandidates('"Hello World"', 1);
      expect(result).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should return empty for blank lines", () => {
      expect(extractCandidates("", 1)).toHaveLength(0);
      expect(extractCandidates("   ", 1)).toHaveLength(0);
    });

    it("should include line number", () => {
      const result = extractCandidates('KEY=sk-proj-fakeKey12345678', 42);
      expect(result[0].lineNumber).toBe(42);
    });

    it("should include rawLine", () => {
      const raw = '  const key = "sk-proj-fakeKey12345678"  ';
      const result = extractCandidates(raw, 1);
      expect(result[0].rawLine).toBe(raw);
    });
  });
});
