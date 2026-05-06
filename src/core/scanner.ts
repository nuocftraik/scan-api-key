import * as path from "node:path";
import type {
  ScanResult,
  ScanConfig,
  Finding,
  Occurrence,
  RuleMatch,
  Confidence,
} from "../types/index.js";
import { walkFiles, readFileLines } from "./fileWalker.js";
import { extractCandidates } from "./candidateExtractor.js";
import { getBuiltinRules } from "../rules/index.js";
import { applyRules } from "../detection/ruleEngine.js";
import { calculateEntropy } from "../detection/entropy.js";
import { analyzeContext } from "../detection/context.js";
import { calculateScore } from "../detection/scoring.js";
import {
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MAX_LINE_LENGTH,
  DEFAULT_MAX_LINES_PER_FILE,
  DEFAULT_IGNORE_PATHS,
  DEFAULT_IGNORE_FILES,
  DEFAULT_ENTROPY_MIN,
  DEFAULT_SCORE_HIGH,
  DEFAULT_SCORE_MEDIUM,
} from "../utils/constants.js";
import { maskValue } from "../reporting/formatter.js";

// ─── Default Config ──────────────────────────────────────────

const DEFAULT_CONFIG: ScanConfig = {
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  maxLineLength: DEFAULT_MAX_LINE_LENGTH,
  maxLinesPerFile: DEFAULT_MAX_LINES_PER_FILE,
  followSymlinks: false,
  ignorePaths: DEFAULT_IGNORE_PATHS,
  ignoreFiles: DEFAULT_IGNORE_FILES,
  ignorePatterns: [],
  ignoreValues: [],
  thresholds: { high: DEFAULT_SCORE_HIGH, medium: DEFAULT_SCORE_MEDIUM },
  entropy: { min: DEFAULT_ENTROPY_MIN },
  format: "cli",
  masking: "partial",
  showLowConfidence: false,
};

// ─── Internal Types ──────────────────────────────────────────

interface RawFinding {
  rawValue: string;
  score: number;
  confidence: Confidence;
  providers: string[];
  matches: RuleMatch[];
  occurrence: Occurrence;
}

// ─── Main Scan Function ──────────────────────────────────────

/**
 * Main scan orchestrator.
 * Walks files → extracts candidates → applies rules → scores → deduplicates.
 */
export async function scan(
  rootPath: string,
  userConfig?: Partial<ScanConfig>,
): Promise<ScanResult> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const startTime = Date.now();
  const absoluteRoot = path.resolve(rootPath);

  const rules = getBuiltinRules();
  const rawFindings: RawFinding[] = [];
  let totalFiles = 0;
  let scannedFiles = 0;

  // Walk files
  for await (const file of walkFiles(absoluteRoot, {
    maxFileSize: config.maxFileSize,
    followSymlinks: config.followSymlinks,
    ignorePaths: config.ignorePaths,
    ignoreFiles: config.ignoreFiles,
  })) {
    totalFiles++;

    const { lines } = await readFileLines(
      file.path,
      config.maxLinesPerFile,
      config.maxLineLength,
    );

    scannedFiles++;

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const candidates = extractCandidates(line, i + 1); // 1-indexed
      if (candidates.length === 0) continue;

      for (const candidate of candidates) {
        // Skip allowlisted values
        if (config.ignoreValues.includes(candidate.value)) continue;

        // Skip ignored patterns
        if (config.ignorePatterns.some((p) => candidate.value.includes(p))) continue;

        // Check context
        const hasContext = analyzeContext(lines, i);

        // Apply rules
        const matches = applyRules(candidate, rules, hasContext);
        if (matches.length === 0) continue;

        // Calculate entropy
        const entropy = calculateEntropy(candidate.value);

        // Calculate score
        const scoreResult = calculateScore({
          matches,
          entropy,
          entropyThreshold: config.entropy.min,
          filePath: file.relativePath,
          rawLine: candidate.rawLine,
          value: candidate.value,
        });

        if (scoreResult.skip) continue;

        // Collect providers
        const providers = [...new Set(matches.map((m) => m.provider))];

        rawFindings.push({
          rawValue: candidate.value,
          score: scoreResult.score,
          confidence: scoreResult.confidence,
          providers,
          matches,
          occurrence: {
            type: "file",
            file: file.relativePath,
            line: candidate.lineNumber,
          },
        });
      }
    }
  }

  // Deduplicate by value
  const findings = deduplicateFindings(rawFindings, config);

  // Filter low confidence if configured
  const filteredFindings = config.showLowConfidence
    ? findings
    : findings.filter((f) => f.confidence !== "low");

  // Build summary
  const summary = {
    high: filteredFindings.filter((f) => f.confidence === "high").length,
    medium: filteredFindings.filter((f) => f.confidence === "medium").length,
    low: filteredFindings.filter((f) => f.confidence === "low").length,
    total: filteredFindings.length,
  };

  return {
    meta: {
      scanDate: new Date().toISOString(),
      scanPath: rootPath,
      durationMs: Date.now() - startTime,
      totalFiles,
      scannedFiles,
    },
    summary,
    findings: filteredFindings,
  };
}

// ─── Deduplication ───────────────────────────────────────────

function deduplicateFindings(
  rawFindings: RawFinding[],
  config: ScanConfig,
): Finding[] {
  const grouped = new Map<string, RawFinding[]>();

  for (const finding of rawFindings) {
    const existing = grouped.get(finding.rawValue) || [];
    existing.push(finding);
    grouped.set(finding.rawValue, existing);
  }

  const findings: Finding[] = [];

  for (const [rawValue, group] of grouped) {
    // Take highest score
    const bestScore = Math.max(...group.map((f) => f.score));
    const bestConfidence = group.reduce<Confidence>((best, f) => {
      const order: Confidence[] = ["low", "medium", "high"];
      return order.indexOf(f.confidence) > order.indexOf(best) ? f.confidence : best;
    }, "low");

    // Merge all providers
    const providers = [...new Set(group.flatMap((f) => f.providers))];

    // Merge all matches
    const allMatches = group.flatMap((f) => f.matches);
    // Deduplicate matches by ruleId
    const uniqueMatches = new Map<string, RuleMatch>();
    for (const match of allMatches) {
      const existing = uniqueMatches.get(match.ruleId);
      if (!existing || match.score > existing.score) {
        uniqueMatches.set(match.ruleId, match);
      }
    }

    // Collect all occurrences
    const occurrences: Occurrence[] = group.map((f) => f.occurrence);

    findings.push({
      value: maskValue(rawValue, config.masking),
      rawValue,
      confidence: bestConfidence,
      score: bestScore,
      providers,
      matches: [...uniqueMatches.values()],
      occurrences,
      sources: ["working_tree"],
    });
  }

  // Sort: high → medium → low, then by score descending
  findings.sort((a, b) => {
    const order: Confidence[] = ["high", "medium", "low"];
    const levelDiff = order.indexOf(a.confidence) - order.indexOf(b.confidence);
    if (levelDiff !== 0) return levelDiff;
    return b.score - a.score;
  });

  return findings;
}
