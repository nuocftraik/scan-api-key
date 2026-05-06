import type { ScanResult } from "../types/index.js";

/**
 * Output scan results as formatted JSON string.
 * Strips rawValue from findings for security.
 */
export function reportJson(result: ScanResult): string {
  // Strip rawValue from output (security)
  const sanitized = {
    ...result,
    findings: result.findings.map(({ rawValue, ...rest }) => rest),
  };

  return JSON.stringify(sanitized, null, 2);
}
