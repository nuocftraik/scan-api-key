import { describe, it, expect } from "vitest";
import { calculateEntropy } from "../../src/detection/entropy.js";

describe("calculateEntropy", () => {
  it("should return 0 for empty string", () => {
    expect(calculateEntropy("")).toBe(0);
  });

  it("should return 0 for single char repeated", () => {
    expect(calculateEntropy("aaaaaaa")).toBe(0);
  });

  it("should return low entropy for simple strings", () => {
    const entropy = calculateEntropy("hello");
    expect(entropy).toBeLessThan(2.5);
  });

  it("should return high entropy for API-key-like strings", () => {
    const entropy = calculateEntropy("sk-proj-fakeKey1234567890abcdefghij");
    expect(entropy).toBeGreaterThan(4.0);
  });

  it("should return high entropy for base64-like strings", () => {
    const entropy = calculateEntropy("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
    expect(entropy).toBeGreaterThan(4.0);
  });

  it("should return moderate entropy for hex strings", () => {
    const entropy = calculateEntropy("AKIAIOSFODNN7EXAMPLE");
    expect(entropy).toBeGreaterThan(3.0);
  });

  it("should return low entropy for placeholder strings", () => {
    const entropy = calculateEntropy("YOUR_API_KEY_HERE");
    expect(entropy).toBeLessThan(4.0);
  });
});
