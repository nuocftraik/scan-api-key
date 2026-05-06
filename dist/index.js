// src/core/scanner.ts
import * as path3 from "path";

// src/core/fileWalker.ts
import * as fs2 from "fs";
import * as path2 from "path";
import * as readline from "readline";

// src/utils/fs.ts
import * as fs from "fs";
import * as path from "path";

// src/utils/constants.ts
var DEFAULT_ENTROPY_MIN = 4.5;
var DEFAULT_SCORE_HIGH = 80;
var DEFAULT_SCORE_MEDIUM = 50;
var MAX_SCORE = 100;
var DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
var DEFAULT_MAX_LINE_LENGTH = 1e4;
var DEFAULT_MAX_LINES_PER_FILE = 2e3;
var DEFAULT_IGNORE_PATHS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  "vendor",
  "__pycache__",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".vscode",
  ".idea"
];
var DEFAULT_IGNORE_FILES = [
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.min.js",
  "*.min.css",
  "*.map"
];
var PLACEHOLDER_PATTERNS = [
  /YOUR_API_KEY/i,
  /API_KEY_HERE/i,
  /INSERT_KEY_HERE/i,
  /REPLACE_ME/i,
  /PUT_YOUR_KEY/i,
  /xxx+/i,
  /dummy/i,
  /example/i,
  /test[_-]?key/i,
  /fake[_-]?key/i,
  /placeholder/i,
  /changeme/i,
  /todo/i,
  /fixme/i,
  /^<.+>$/,
  // <YOUR_KEY>
  /^\{.+\}$/,
  // {YOUR_KEY}
  /your[_-]/i,
  /\.\.\.$/,
  // ends with ...
  /\*\*\*+$/,
  // ends with ***
  /[.]{3,}/,
  // ... anywhere
  /[*]{3,}/,
  // *** anywhere
  /123456789/,
  // simple sequences
  /00000000/,
  /11111111/,
  /abcdefgh/i,
  /^a+$/i,
  /^b+$/i,
  /^c+$/i,
  /^x+$/i,
  /^y+$/i,
  /^z+$/i,
  /your[_-]?api[_-]?key/i,
  /your[_-]?secret/i,
  /your[_-]?token/i,
  /insert[_-]?your/i,
  /enter[_-]?your/i,
  /xxxxxxxxxxxxxxxx/i
];
var KNOWN_SAFE_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\.0\.0\.1/,
  /^true$/i,
  /^false$/i,
  /^null$/i,
  /^undefined$/i,
  /^none$/i,
  /^\d+$/
  // pure numbers
];
var TEST_FILE_PATTERNS = [
  /[/\\]test[/\\]/i,
  /[/\\]tests[/\\]/i,
  /[/\\]__tests__[/\\]/i,
  /[/\\]__test__[/\\]/i,
  /[/\\]spec[/\\]/i,
  /[/\\]specs[/\\]/i,
  /[/\\]example[/\\]/i,
  /[/\\]examples[/\\]/i,
  /[/\\]fixture[/\\]/i,
  /[/\\]fixtures[/\\]/i,
  /[/\\]mock[/\\]/i,
  /[/\\]mocks[/\\]/i,
  /\.test\.[jt]sx?$/i,
  /\.spec\.[jt]sx?$/i,
  /\.example\./i
];
var COMMENT_PREFIXES = [
  "//",
  "#",
  "--",
  "/*",
  "*",
  "<!--",
  "rem "
];
var NEGATIVE_WEIGHTS = {
  placeholder: -60,
  testFile: -20,
  comment: -10,
  lowEntropy: -20
};
var DEFAULT_CONTEXT_PATTERNS = [
  /Authorization/i,
  /Bearer/i,
  /x-api-key/i,
  /credentials/i,
  /headers?\s*[=:({]/i,
  /fetch\s*\(/i,
  /axios/i,
  /\.request\s*\(/i,
  /api[_-]?endpoint/i,
  /secret/i
];

// src/utils/fs.ts
function isBinaryFile(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}
function isIgnoredPath(filePath, ignorePaths = DEFAULT_IGNORE_PATHS) {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  for (const ignore of ignorePaths) {
    if (segments.includes(ignore)) return true;
  }
  return false;
}
function isIgnoredFile(filePath, ignoreFiles = DEFAULT_IGNORE_FILES) {
  const basename2 = path.basename(filePath);
  for (const pattern of ignoreFiles) {
    if (pattern.startsWith("*")) {
      const ext = pattern.slice(1);
      if (basename2.endsWith(ext)) return true;
    } else {
      if (basename2 === pattern) return true;
    }
  }
  return false;
}
function isSymlink(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}
function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return -1;
  }
}

// src/utils/logger.ts
var debugEnabled = false;
function log(level, message, ...args) {
  const prefix = {
    info: "\u2139\uFE0F ",
    warn: "\u26A0\uFE0F ",
    error: "\u274C",
    debug: "\u{1F527}"
  }[level];
  if (level === "debug" && !debugEnabled) return;
  const fn = level === "error" ? console.error : console.log;
  fn(`${prefix} ${message}`, ...args);
}
var logger = {
  info: (msg, ...args) => log("info", msg, ...args),
  warn: (msg, ...args) => log("warn", msg, ...args),
  error: (msg, ...args) => log("error", msg, ...args),
  debug: (msg, ...args) => log("debug", msg, ...args)
};

// src/core/fileWalker.ts
var DEFAULT_WALK_OPTIONS = {
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  followSymlinks: false,
  ignorePaths: DEFAULT_IGNORE_PATHS,
  ignoreFiles: DEFAULT_IGNORE_FILES
};
async function* walkFiles(rootPath, options = {}) {
  const opts = { ...DEFAULT_WALK_OPTIONS, ...options };
  const absoluteRoot = path2.resolve(rootPath);
  yield* walkDir(absoluteRoot, absoluteRoot, opts);
}
async function* walkDir(dirPath, rootPath, opts) {
  let entries;
  try {
    entries = fs2.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    logger.warn(`Cannot read directory: ${dirPath}`);
    return;
  }
  for (const entry of entries) {
    const fullPath = path2.join(dirPath, entry.name);
    const relativePath = path2.relative(rootPath, fullPath);
    if (isIgnoredPath(relativePath, opts.ignorePaths)) continue;
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, rootPath, opts);
      continue;
    }
    if (!entry.isFile()) {
      if (entry.isSymbolicLink() && !opts.followSymlinks) continue;
      continue;
    }
    if (!opts.followSymlinks && isSymlink(fullPath)) continue;
    if (isIgnoredFile(fullPath, opts.ignoreFiles)) continue;
    const size = getFileSize(fullPath);
    if (size > opts.maxFileSize) {
      logger.warn(`Skipped large file: ${relativePath} (${(size / 1024 / 1024).toFixed(1)}MB > ${(opts.maxFileSize / 1024 / 1024).toFixed(0)}MB)`);
      continue;
    }
    try {
      if (isBinaryFile(fullPath)) continue;
    } catch {
      continue;
    }
    yield { path: fullPath, relativePath };
  }
}
async function readFileLines(filePath, maxLines = 2e3, maxLineLength = 1e4) {
  const lines = [];
  let truncated = false;
  const stream = fs2.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }
    if (line.length > maxLineLength) {
      lines.push("");
      continue;
    }
    lines.push(line);
  }
  stream.destroy();
  return { lines, truncated };
}

// src/core/candidateExtractor.ts
function extractCandidates(line, lineNumber) {
  const candidates = [];
  const trimmed = line.trim();
  if (!trimmed) return candidates;
  const assignmentCandidates = extractFromAssignment(trimmed, lineNumber, line);
  candidates.push(...assignmentCandidates);
  if (candidates.length === 0) {
    const quotedCandidates = extractQuotedStrings(trimmed, lineNumber, line);
    candidates.push(...quotedCandidates);
  }
  return candidates;
}
function extractFromAssignment(trimmed, lineNumber, rawLine) {
  const candidates = [];
  const envMatch = trimmed.match(
    /^([A-Z][A-Z0-9_]*)\s*=\s*["']?([^"'\s#][^"'\n#]*)["']?\s*(?:#.*)?$/
  );
  if (envMatch) {
    const value = envMatch[2].trim();
    if (value.length >= 8) {
      candidates.push({
        value,
        keyName: envMatch[1],
        lineNumber,
        rawLine
      });
    }
    return candidates;
  }
  const jsAssignMatch = trimmed.match(
    /(?:const|let|var|export)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*["'`]([^"'`]+)["'`]/
  );
  if (jsAssignMatch) {
    const value = jsAssignMatch[2];
    if (value.length >= 8) {
      candidates.push({
        value,
        keyName: jsAssignMatch[1],
        lineNumber,
        rawLine
      });
    }
    return candidates;
  }
  const kvMatch = trimmed.match(
    /["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*[:=]\s*["'`]([^"'`]+)["'`]/
  );
  if (kvMatch) {
    const value = kvMatch[2];
    if (value.length >= 8) {
      candidates.push({
        value,
        keyName: kvMatch[1],
        lineNumber,
        rawLine
      });
    }
    return candidates;
  }
  return candidates;
}
function extractQuotedStrings(trimmed, lineNumber, rawLine) {
  const candidates = [];
  const quoteRegex = /["'`]([A-Za-z0-9_\-./+=]{16,})["'`]/g;
  let match;
  while ((match = quoteRegex.exec(trimmed)) !== null) {
    candidates.push({
      value: match[1],
      lineNumber,
      rawLine
    });
  }
  return candidates;
}

// src/rules/providers/openai.ts
var openaiRules = [
  {
    id: "openai-key",
    name: "OpenAI API Key",
    provider: "openai",
    valuePattern: /sk-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CHATGPT_API_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"]
  },
  {
    id: "openai-project-key",
    name: "OpenAI Project Key",
    provider: "openai",
    valuePattern: /sk-proj-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CHATGPT_API_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"]
  },
  {
    id: "openai-service-key",
    name: "OpenAI Service Key",
    provider: "openai",
    valuePattern: /sk-svc-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"]
  },
  {
    id: "openai-org-key",
    name: "OpenAI Organization Key",
    provider: "openai",
    valuePattern: /sk-org-[a-zA-Z0-9_.-]{40,}/,
    keyPattern: /OPENAI_API_KEY|OPENAI_SECRET_KEY|CODEX_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"]
  }
];

// src/rules/providers/anthropic.ts
var anthropicRules = [
  {
    id: "anthropic-key",
    name: "Anthropic API Key",
    provider: "anthropic",
    valuePattern: /sk-ant-api\d{2}-[A-Za-z0-9_-]{60,}/,
    keyPattern: /ANTHROPIC_API_KEY|CLAUDE_API_KEY|ANTHROPIC_AUTH_TOKEN/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"]
  }
];

// src/rules/providers/google.ts
var googleRules = [
  {
    id: "gemini-api-key",
    name: "Gemini API Key",
    provider: "gemini",
    valuePattern: /AIzaSy[A-Za-z0-9_-]{33}/,
    keyPattern: /GEMINI_API_KEY|GOOGLE_AI_API_KEY|MAKERSUITE_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["ai"]
  },
  {
    id: "google-api-key",
    name: "Google Cloud API Key",
    provider: "google",
    valuePattern: /AIzaSy[A-Za-z0-9_-]{33}/,
    keyPattern: /GOOGLE_API_KEY|GCP_KEY|YOUTUBE_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["cloud"]
  }
];

// src/rules/providers/aws.ts
var awsRules = [
  {
    id: "aws-access-key",
    name: "AWS Access Key ID",
    provider: "aws",
    valuePattern: /AKIA[0-9A-Z]{16}/,
    keyPattern: /AWS_ACCESS_KEY_ID/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["cloud"]
  },
  {
    id: "aws-secret-key",
    name: "AWS Secret Access Key",
    provider: "aws",
    valuePattern: /[A-Za-z0-9/+=]{40}/,
    keyPattern: /AWS_SECRET_ACCESS_KEY/i,
    weight: { valueMatch: 40, keyMatch: 30, contextMatch: 15 },
    severity: "critical",
    tags: ["cloud"]
  }
];

// src/rules/providers/github.ts
var githubRules = [
  {
    id: "github-pat",
    name: "GitHub Personal Access Token",
    provider: "github",
    valuePattern: /ghp_[A-Za-z0-9]{36}/,
    keyPattern: /GITHUB_TOKEN|GH_TOKEN|GITHUB_PAT/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "critical",
    tags: ["vcs"]
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth Token",
    provider: "github",
    valuePattern: /gho_[A-Za-z0-9]{36}/,
    weight: { valueMatch: 60, keyMatch: 20, contextMatch: 15 },
    severity: "high",
    tags: ["vcs"]
  },
  {
    id: "github-app",
    name: "GitHub App Token",
    provider: "github",
    valuePattern: /ghu_[A-Za-z0-9]{36}/,
    weight: { valueMatch: 60, keyMatch: 20, contextMatch: 15 },
    severity: "high",
    tags: ["vcs"]
  }
];

// src/rules/providers/huggingface.ts
var huggingfaceRules = [
  {
    id: "huggingface-token",
    name: "Hugging Face API Token",
    provider: "huggingface",
    valuePattern: /hf_[A-Za-z0-9]{34}/,
    keyPattern: /HF_TOKEN|HUGGINGFACE_API_KEY|HUGGING_FACE_TOKEN/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["ai"]
  }
];

// src/rules/providers/replicate.ts
var replicateRules = [
  {
    id: "replicate-token",
    name: "Replicate API Token",
    provider: "replicate",
    valuePattern: /r8_[A-Za-z0-9]{37}/,
    keyPattern: /REPLICATE_API_TOKEN|REPLICATE_API_KEY/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["ai"]
  }
];

// src/rules/providers/generic.ts
var genericRules = [
  {
    id: "generic-api-key",
    name: "Generic API Key",
    provider: "generic",
    keyPattern: /API_KEY|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|BEARER_TOKEN|CLIENT_SECRET|PRIVATE_KEY/i,
    weight: { valueMatch: 0, keyMatch: 25, contextMatch: 15, entropy: 20 },
    severity: "medium",
    tags: ["generic"]
  }
];

// src/rules/providers/stripe.ts
var stripeRules = [
  {
    id: "stripe-live-key",
    name: "Stripe Live Secret Key",
    provider: "stripe",
    valuePattern: /sk_live_[0-9a-zA-Z]{24,}/,
    keyPattern: /STRIPE_SECRET_KEY|STRIPE_API_KEY/i,
    weight: { valueMatch: 80, keyMatch: 20, contextMatch: 0 },
    severity: "critical",
    tags: ["payment"]
  },
  {
    id: "stripe-test-key",
    name: "Stripe Test Secret Key",
    provider: "stripe",
    valuePattern: /sk_test_[0-9a-zA-Z]{24,}/,
    weight: { valueMatch: 60, keyMatch: 20, contextMatch: 0 },
    severity: "medium",
    tags: ["payment"]
  }
];

// src/rules/providers/slack.ts
var slackRules = [
  {
    id: "slack-bot-token",
    name: "Slack Bot Token",
    provider: "slack",
    valuePattern: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}/,
    weight: { valueMatch: 80, keyMatch: 10, contextMatch: 10 },
    severity: "high",
    tags: ["social"]
  },
  {
    id: "slack-user-token",
    name: "Slack User Token",
    provider: "slack",
    valuePattern: /xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}/,
    weight: { valueMatch: 80, keyMatch: 10, contextMatch: 10 },
    severity: "critical",
    tags: ["social"]
  }
];

// src/rules/providers/copilot.ts
var copilotRules = [
  {
    id: "github-copilot-token",
    name: "GitHub Copilot Token",
    provider: "copilot",
    valuePattern: /gh[uop]_[A-Za-z0-9]{36}/,
    keyPattern: /COPILOT_TOKEN|COPILOT_API_KEY|GITHUB_COPILOT/i,
    weight: { valueMatch: 50, keyMatch: 30, contextMatch: 10 },
    severity: "high",
    tags: ["ai", "copilot"]
  }
];

// src/rules/providers/cursor.ts
var cursorRules = [
  {
    id: "cursor-api-key",
    name: "Cursor API Key",
    provider: "cursor",
    valuePattern: /sk_cursor_[A-Za-z0-9_-]{20,}/,
    keyPattern: /CURSOR_API_KEY|CURSOR_SESSION_TOKEN/i,
    weight: { valueMatch: 60, keyMatch: 25, contextMatch: 15 },
    severity: "high",
    tags: ["ai", "ide"]
  }
];

// src/rules/index.ts
function getBuiltinRules() {
  return [
    // Specific providers (have valuePattern → higher confidence)
    ...openaiRules,
    ...anthropicRules,
    ...googleRules,
    ...awsRules,
    ...githubRules,
    ...huggingfaceRules,
    ...replicateRules,
    ...stripeRules,
    ...slackRules,
    ...copilotRules,
    ...cursorRules,
    // Generic (no valuePattern → lower confidence)
    ...genericRules
  ];
}

// src/detection/ruleEngine.ts
function applyRules(candidate, rules, hasContextMatch) {
  const matches = [];
  for (const rule of rules) {
    const signals = matchRule(rule, candidate, hasContextMatch);
    if (rule.valuePattern && !signals.valueMatch) {
      continue;
    }
    if (!signals.valueMatch && !signals.keyMatch) {
      continue;
    }
    const score = calculateRuleScore(rule, signals);
    matches.push({
      ruleId: rule.id,
      provider: rule.provider,
      signals,
      score
    });
  }
  return matches;
}
function matchRule(rule, candidate, hasContextMatch) {
  let valueMatch = false;
  let keyMatch = false;
  if (rule.valuePattern) {
    valueMatch = rule.valuePattern.test(candidate.value);
  }
  if (rule.keyPattern && candidate.keyName) {
    keyMatch = rule.keyPattern.test(candidate.keyName);
  }
  return {
    valueMatch,
    keyMatch,
    contextMatch: hasContextMatch,
    entropy: 0
    // entropy is added externally by scoring
  };
}
function calculateRuleScore(rule, signals) {
  let score = 0;
  if (signals.valueMatch) score += rule.weight.valueMatch;
  if (signals.keyMatch) score += rule.weight.keyMatch ?? 0;
  if (signals.contextMatch) score += rule.weight.contextMatch ?? 0;
  return score;
}

// src/detection/entropy.ts
function calculateEntropy(value) {
  if (!value || value.length === 0) return 0;
  const freq = /* @__PURE__ */ new Map();
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

// src/detection/context.ts
function analyzeContext(lines, targetLineIndex, patterns = DEFAULT_CONTEXT_PATTERNS) {
  const radius = 3;
  const start = Math.max(0, targetLineIndex - radius);
  const end = Math.min(lines.length - 1, targetLineIndex + radius);
  for (let i = start; i <= end; i++) {
    if (i === targetLineIndex) continue;
    const line = lines[i];
    for (const pattern of patterns) {
      if (pattern.test(line)) return true;
    }
  }
  return false;
}

// src/detection/scoring.ts
function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}
function isKnownSafe(value) {
  return KNOWN_SAFE_PATTERNS.some((p) => p.test(value));
}
function isTestFile(filePath) {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}
function isComment(line) {
  const trimmed = line.trim();
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}
function calculateScore(input) {
  const {
    matches,
    entropy,
    entropyThreshold = DEFAULT_ENTROPY_MIN,
    filePath,
    rawLine,
    value
  } = input;
  const negativeSignals = [];
  if (isKnownSafe(value)) {
    return { score: 0, confidence: "low", negativeSignals: [], skip: true };
  }
  let score = 0;
  for (const match of matches) {
    score += match.score;
  }
  if (entropy >= entropyThreshold) {
    const maxEntropyWeight = Math.max(
      ...matches.map((m) => {
        return 0;
      }),
      0
    );
    if (score > 0) {
      score += 10;
    }
  }
  if (isPlaceholder(value)) {
    negativeSignals.push({ type: "placeholder", weight: NEGATIVE_WEIGHTS.placeholder });
    score += NEGATIVE_WEIGHTS.placeholder;
  }
  if (isTestFile(filePath)) {
    negativeSignals.push({ type: "test_file", weight: NEGATIVE_WEIGHTS.testFile });
    score += NEGATIVE_WEIGHTS.testFile;
  }
  if (isComment(rawLine)) {
    negativeSignals.push({ type: "comment", weight: NEGATIVE_WEIGHTS.comment });
    score += NEGATIVE_WEIGHTS.comment;
  }
  if (entropy < entropyThreshold && entropy > 0) {
    negativeSignals.push({ type: "low_entropy", weight: NEGATIVE_WEIGHTS.lowEntropy });
    score += NEGATIVE_WEIGHTS.lowEntropy;
  }
  score = Math.max(0, Math.min(MAX_SCORE, score));
  return {
    score,
    confidence: assignConfidence(score),
    negativeSignals,
    skip: false
  };
}
function assignConfidence(score, highThreshold = DEFAULT_SCORE_HIGH, mediumThreshold = DEFAULT_SCORE_MEDIUM) {
  if (score > highThreshold) return "high";
  if (score >= mediumThreshold) return "medium";
  return "low";
}

// src/reporting/formatter.ts
function maskValue(value, mode = "partial") {
  if (mode === "none") return value;
  if (mode === "full") return "****";
  if (value.length <= 8) return "****";
  const prefixLen = Math.min(6, Math.floor(value.length * 0.2));
  const suffixLen = Math.min(4, Math.floor(value.length * 0.1));
  const prefix = value.slice(0, Math.max(4, prefixLen));
  const suffix = value.slice(-Math.max(2, suffixLen));
  return `${prefix}****${suffix}`;
}

// src/core/scanner.ts
var DEFAULT_CONFIG = {
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
  showLowConfidence: false
};
async function scan(rootPath, userConfig) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const startTime = Date.now();
  const absoluteRoot = path3.resolve(rootPath);
  const rules = getBuiltinRules();
  const rawFindings = [];
  let totalFiles = 0;
  let scannedFiles = 0;
  for await (const file of walkFiles(absoluteRoot, {
    maxFileSize: config.maxFileSize,
    followSymlinks: config.followSymlinks,
    ignorePaths: config.ignorePaths,
    ignoreFiles: config.ignoreFiles
  })) {
    totalFiles++;
    const { lines } = await readFileLines(
      file.path,
      config.maxLinesPerFile,
      config.maxLineLength
    );
    scannedFiles++;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const candidates = extractCandidates(line, i + 1);
      if (candidates.length === 0) continue;
      for (const candidate of candidates) {
        if (config.ignoreValues.includes(candidate.value)) continue;
        if (config.ignorePatterns.some((p) => candidate.value.includes(p))) continue;
        const hasContext = analyzeContext(lines, i);
        const matches = applyRules(candidate, rules, hasContext);
        if (matches.length === 0) continue;
        const entropy = calculateEntropy(candidate.value);
        const scoreResult = calculateScore({
          matches,
          entropy,
          entropyThreshold: config.entropy.min,
          filePath: file.relativePath,
          rawLine: candidate.rawLine,
          value: candidate.value
        });
        if (scoreResult.skip) continue;
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
            line: candidate.lineNumber
          }
        });
      }
    }
  }
  const findings = deduplicateFindings(rawFindings, config);
  const filteredFindings = config.showLowConfidence ? findings : findings.filter((f) => f.confidence !== "low");
  const summary = {
    high: filteredFindings.filter((f) => f.confidence === "high").length,
    medium: filteredFindings.filter((f) => f.confidence === "medium").length,
    low: filteredFindings.filter((f) => f.confidence === "low").length,
    total: filteredFindings.length
  };
  return {
    meta: {
      scanDate: (/* @__PURE__ */ new Date()).toISOString(),
      scanPath: rootPath,
      durationMs: Date.now() - startTime,
      totalFiles,
      scannedFiles
    },
    summary,
    findings: filteredFindings
  };
}
function deduplicateFindings(rawFindings, config) {
  const grouped = /* @__PURE__ */ new Map();
  for (const finding of rawFindings) {
    const existing = grouped.get(finding.rawValue) || [];
    existing.push(finding);
    grouped.set(finding.rawValue, existing);
  }
  const findings = [];
  for (const [rawValue, group] of grouped) {
    const bestScore = Math.max(...group.map((f) => f.score));
    const bestConfidence = group.reduce((best, f) => {
      const order = ["low", "medium", "high"];
      return order.indexOf(f.confidence) > order.indexOf(best) ? f.confidence : best;
    }, "low");
    const providers = [...new Set(group.flatMap((f) => f.providers))];
    const allMatches = group.flatMap((f) => f.matches);
    const uniqueMatches = /* @__PURE__ */ new Map();
    for (const match of allMatches) {
      const existing = uniqueMatches.get(match.ruleId);
      if (!existing || match.score > existing.score) {
        uniqueMatches.set(match.ruleId, match);
      }
    }
    const occurrences = group.map((f) => f.occurrence);
    findings.push({
      value: maskValue(rawValue, config.masking),
      rawValue,
      confidence: bestConfidence,
      score: bestScore,
      providers,
      matches: [...uniqueMatches.values()],
      occurrences,
      sources: ["working_tree"]
    });
  }
  findings.sort((a, b) => {
    const order = ["high", "medium", "low"];
    const levelDiff = order.indexOf(a.confidence) - order.indexOf(b.confidence);
    if (levelDiff !== 0) return levelDiff;
    return b.score - a.score;
  });
  return findings;
}
export {
  scan
};
//# sourceMappingURL=index.js.map