import type { ScanResult } from "../types/index.js";
import { red, yellow, green, blue, bold, gray, dim } from "./formatter.js";

/**
 * Output scan results in human-friendly CLI format.
 */
export function reportCli(result: ScanResult): void {
  const { meta, summary, findings } = result;

  console.log("");
  console.log(blue(`🔍 Scanning ${meta.scanPath}...`));
  console.log(dim("━".repeat(50)));

  if (findings.length === 0) {
    console.log(green("✅ No secrets found"));
    console.log(
      gray(`⏱️  Scanned ${meta.scannedFiles} files in ${formatDuration(meta.durationMs)}`),
    );
    console.log("");
    return;
  }

  for (const finding of findings) {
    const icon = finding.confidence === "high" ? "🔴" : finding.confidence === "medium" ? "🟡" : "🔵";
    const color = finding.confidence === "high" ? red : finding.confidence === "medium" ? yellow : blue;
    const label = `[${finding.confidence.toUpperCase()}]`;

    const providerLabel = finding.providers.join(", ");
    const ruleName = finding.matches[0]?.ruleId || "unknown";

    console.log("");
    console.log(
      `${icon} ${color(bold(label))} ${providerLabel} key detected ${gray(`(score: ${finding.score}, rule: ${ruleName})`)}`,
    );
    console.log(`   Value:  ${finding.value}`);
    console.log(`   Files:`);

    for (const occ of finding.occurrences) {
      if (occ.type === "history") {
        console.log(gray(`     → (history) ${occ.commit} ${occ.file}:${occ.line}`));
      } else {
        console.log(`     → ${occ.file}:${occ.line}`);
      }
    }
  }

  console.log("");
  console.log(dim("━".repeat(50)));

  const parts: string[] = [];
  if (summary.high > 0) parts.push(red(`${summary.high} high`));
  if (summary.medium > 0) parts.push(yellow(`${summary.medium} medium`));
  if (summary.low > 0) parts.push(blue(`${summary.low} low`));

  console.log(`📊 Summary: ${bold(String(summary.total))} findings (${parts.join(", ")})`);
  console.log(
    gray(`⏱️  Scanned ${meta.scannedFiles}/${meta.totalFiles} files in ${formatDuration(meta.durationMs)}`),
  );
  console.log("");
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
