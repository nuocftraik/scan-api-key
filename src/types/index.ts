// ─── Rule Definition ─────────────────────────────────────────

export type Severity = "low" | "medium" | "high" | "critical";
export type Confidence = "low" | "medium" | "high";

export interface RuleWeight {
  valueMatch: number;
  keyMatch?: number;
  contextMatch?: number;
  entropy?: number;
}

export interface RuleEntropy {
  min?: number;
  max?: number;
}

export interface Rule {
  id: string;
  name: string;
  provider: string;

  // Detection patterns
  valuePattern?: RegExp;
  keyPattern?: RegExp;
  contextPatterns?: RegExp[];

  // Scoring weights (per-rule)
  weight: RuleWeight;

  // Entropy config (per-rule override)
  entropy?: RuleEntropy;

  // Metadata
  severity: Severity;
  tags?: string[];

  // File filtering
  allowInFiles?: RegExp[];
  denyInFiles?: RegExp[];
}

// ─── Candidate (extracted from source line) ──────────────────

export interface Candidate {
  value: string;
  keyName?: string;
  lineNumber: number;
  rawLine: string;
}

// ─── Detection Results ───────────────────────────────────────

export interface RuleMatchSignals {
  valueMatch: boolean;
  keyMatch: boolean;
  contextMatch: boolean;
  entropy: number;
}

export interface RuleMatch {
  ruleId: string;
  provider: string;
  signals: RuleMatchSignals;
  score: number;
}

export interface Occurrence {
  type: "file" | "history";
  file: string;
  line: number;

  // history-only
  commit?: string;
  author?: string;
  date?: string;
}

export interface Finding {
  value: string;          // masked
  rawValue: string;       // internal only, never output
  confidence: Confidence;
  score: number;

  providers: string[];
  matches: RuleMatch[];
  occurrences: Occurrence[];
  sources: ("working_tree" | "history")[];
}

// ─── Scan Result ─────────────────────────────────────────────

export interface ScanMeta {
  scanDate: string;
  scanPath: string;
  durationMs: number;
  totalFiles: number;
  scannedFiles: number;
}

export interface ScanSummary {
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface ScanResult {
  meta: ScanMeta;
  summary: ScanSummary;
  findings: Finding[];
}

// ─── Config ──────────────────────────────────────────────────

export type MaskingMode = "partial" | "full" | "none";
export type OutputFormat = "cli" | "json";

export interface ScanConfig {
  // Scanning
  maxFileSize: number;        // bytes
  maxLineLength: number;
  maxLinesPerFile: number;
  followSymlinks: boolean;

  // Ignore
  ignorePaths: string[];
  ignoreFiles: string[];
  ignorePatterns: string[];   // placeholder patterns
  ignoreValues: string[];     // allowlisted values

  // Scoring
  thresholds: {
    high: number;
    medium: number;
  };
  entropy: {
    min: number;
  };

  // Output
  format: OutputFormat;
  masking: MaskingMode;
  showLowConfidence: boolean;

  // Rules
  enableProviders?: string[];
  disableProviders?: string[];
  customRules?: Rule[];
}

// ─── Internal (file processing) ──────────────────────────────

export interface FileEntry {
  path: string;
  relativePath: string;
}

export interface NegativeSignal {
  type: "placeholder" | "test_file" | "comment" | "low_entropy" | "known_safe";
  weight: number;
}
