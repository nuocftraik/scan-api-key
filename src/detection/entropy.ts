/**
 * Shannon entropy calculator.
 * Measures randomness of a string — higher entropy = more likely a real key.
 */
export function calculateEntropy(value: string): number {
  if (!value || value.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of value) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = value.length;

  for (const count of freq.values()) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}
