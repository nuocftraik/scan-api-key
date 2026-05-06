#!/usr/bin/env node

// src/cli/index.ts
import { Command } from "commander";

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

// src/utils/constants.ts
var DEFAULT_ENTROPY_MIN = 4.5;
var DEFAULT_SCORE_HIGH = 80;
var DEFAULT_SCORE_MEDIUM = 50;
var MAX_SCORE = 100;
var DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
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

// src/core/verifier.ts
async function verifyKey(provider, key) {
  const p = provider.toLowerCase();
  if (p === "openai") return verifyOpenAIKey(key);
  if (p === "anthropic") return verifyAnthropicKey(key);
  if (p === "github" || p === "copilot") return verifyGitHubKey(key);
  if (p === "gemini") return verifyGeminiKey(key);
  if (p === "huggingface") return verifyHuggingFaceKey(key);
  return "unsupported";
}
async function verifyOpenAIKey(key) {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` }
    });
    if (res.status === 200) return "active";
    if (res.status === 429) return "quota_exceeded";
    if (res.status === 401) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}
async function verifyAnthropicKey(key) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }]
      })
    });
    if (res.status === 200) return "active";
    if (res.status === 429) return "quota_exceeded";
    if (res.status === 400) return "active";
    if (res.status === 401 || res.status === 403) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}
async function verifyGitHubKey(key) {
  try {
    const res = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        "Authorization": `token ${key}`,
        "User-Agent": "sks-verifier"
      }
    });
    if (res.status === 200) return "active";
    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") return "quota_exceeded";
    if (res.status === 401) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}
async function verifyGeminiKey(key) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      method: "GET"
    });
    if (res.status === 200) return "active";
    if (res.status === 429) return "quota_exceeded";
    if (res.status === 400 || res.status === 403) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}
async function verifyHuggingFaceKey(key) {
  try {
    const res = await fetch("https://huggingface.co/api/whoami-v2", {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` }
    });
    if (res.status === 200) return "active";
    if (res.status === 401) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// src/reporting/formatter.ts
var COLORS = {
  red: "\x1B[31m",
  yellow: "\x1B[33m",
  green: "\x1B[32m",
  blue: "\x1B[34m",
  gray: "\x1B[90m",
  bold: "\x1B[1m",
  reset: "\x1B[0m",
  dim: "\x1B[2m"
};
function red(text) {
  return `${COLORS.red}${text}${COLORS.reset}`;
}
function yellow(text) {
  return `${COLORS.yellow}${text}${COLORS.reset}`;
}
function green(text) {
  return `${COLORS.green}${text}${COLORS.reset}`;
}
function blue(text) {
  return `${COLORS.blue}${text}${COLORS.reset}`;
}
function gray(text) {
  return `${COLORS.gray}${text}${COLORS.reset}`;
}
function bold(text) {
  return `${COLORS.bold}${text}${COLORS.reset}`;
}
function dim(text) {
  return `${COLORS.dim}${text}${COLORS.reset}`;
}

// src/cli/commands/hunt.ts
import ora from "ora";
async function huntCommand(query, options) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(yellow("\u26A0\uFE0F GITHUB_TOKEN environment variable is not set. You will face severe rate limits."));
  }
  const targetLimit = parseInt(options.limit || "30", 10);
  console.log(blue(`
\u{1F50D} Hunting GitHub for: ${bold(query)} (Target: ${targetLimit} valid keys)`));
  console.log(dim("\u2501".repeat(70)));
  const headers = {
    "User-Agent": "sks-scanner-bot",
    "Accept": "application/vnd.github.v3+json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const rules = getBuiltinRules();
  let totalFindings = 0;
  let page = 1;
  let totalFilesScanned = 0;
  const spinner = ora("Starting hunt...").start();
  try {
    while (totalFindings < targetLimit) {
      spinner.text = `Fetching GitHub Search API (Page ${page})...`;
      const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=30&page=${page}`;
      const searchRes = await fetch(searchUrl, { headers });
      if (!searchRes.ok) {
        if (searchRes.status === 403 || searchRes.status === 429) {
          spinner.warn(yellow(`\u26A0\uFE0F GitHub API Rate limit hit at page ${page}. Stopping hunt.`));
          break;
        }
        if (searchRes.status === 422) {
          spinner.info(gray(`GitHub limits search to 1000 results (reached at page ${page}). Stopping hunt.`));
          break;
        }
        spinner.fail(`GitHub API error: ${searchRes.statusText}`);
        break;
      }
      const searchData = await searchRes.json();
      const items = searchData.items || [];
      if (items.length === 0) {
        if (page === 1) {
          spinner.info(green("\u2705 No files found on GitHub matching the query."));
        } else {
          spinner.info(gray(`No more search results after page ${page - 1}.`));
        }
        break;
      }
      if (page === 1) {
        spinner.succeed(`Found ~${searchData.total_count} raw files on GitHub.`);
        spinner.start(`Hunting until we find ${targetLimit} valid keys...`);
      }
      for (let fileIndex = 0; fileIndex < items.length; fileIndex++) {
        if (totalFindings >= targetLimit) break;
        const item = items[fileIndex];
        const fileUrl = item.url;
        const htmlUrl = item.html_url;
        const repoName = item.repository.full_name;
        spinner.text = `[Page ${page}] Scanning file ${fileIndex + 1}/${items.length} from ${repoName}...`;
        const contentRes = await fetch(fileUrl, {
          headers: { ...headers, "Accept": "application/vnd.github.v3.raw" }
        });
        if (!contentRes.ok) {
          continue;
        }
        const content = await contentRes.text();
        totalFilesScanned++;
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const candidates = extractCandidates(line, i + 1);
          if (candidates.length === 0) continue;
          for (const candidate of candidates) {
            const hasContext = analyzeContext(lines, i);
            let matches = applyRules(candidate, rules, hasContext);
            if (options.provider) {
              matches = matches.filter((m) => m.provider.toLowerCase() === options.provider.toLowerCase());
            }
            if (matches.length === 0) continue;
            const entropy = calculateEntropy(candidate.value);
            const scoreResult = calculateScore({
              matches,
              entropy,
              entropyThreshold: DEFAULT_ENTROPY_MIN,
              filePath: item.path,
              rawLine: candidate.rawLine,
              value: candidate.value
            });
            if (scoreResult.skip || scoreResult.confidence === "low") continue;
            const providerName = matches[0].provider;
            spinner.text = `[Page ${page}] Verifying potential ${providerName} key from ${repoName}...`;
            const verifyStatus = await verifyKey(providerName, candidate.value);
            if (verifyStatus !== "unsupported") {
              if (verifyStatus === "dead" || verifyStatus === "unknown") {
                continue;
              }
            }
            totalFindings++;
            let verifyBadge = "";
            if (verifyStatus === "active") verifyBadge = green(bold(" [LIVE/WORKING]"));
            if (verifyStatus === "quota_exceeded") verifyBadge = yellow(bold(" [OUT_OF_QUOTA]"));
            const icon = scoreResult.confidence === "high" ? "\u{1F534}" : "\u{1F7E1}";
            const color = scoreResult.confidence === "high" ? red : yellow;
            const label = `[${scoreResult.confidence.toUpperCase()}]`;
            const providerLabel = [...new Set(matches.map((m) => m.provider))].join(", ");
            spinner.stop();
            console.log(`${icon} ${color(bold(label))} ${providerLabel} key detected${verifyBadge} (score: ${scoreResult.score})`);
            console.log(`   Repo:  ${bold(repoName)}`);
            console.log(`   Value: ${bold(candidate.value)}`);
            console.log(`   Link:  ${htmlUrl}#L${candidate.lineNumber}`);
            console.log("");
            spinner.start();
            if (totalFindings >= targetLimit) break;
          }
          if (totalFindings >= targetLimit) break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (items.length < 30) {
        break;
      }
      page++;
    }
    spinner.stop();
    console.log(dim("\u2501".repeat(70)));
    console.log(gray(`Files downloaded and scanned: ${totalFilesScanned}`));
    if (totalFindings === 0) {
      console.log(green("\u2705 Scanned successfully. No valid leaks found (only placeholders/noise)."));
    } else {
      console.log(red(`\u{1F6A8} Hunt complete! Successfully acquired ${totalFindings} valid keys.`));
    }
  } catch (err) {
    spinner.stop();
    console.error(red(`\u274C Hunt failed: ${err instanceof Error ? err.message : String(err)}`));
    process.exitCode = 2;
  }
}

// src/cli/commands/suggest.ts
import prompts from "prompts";
var SUGGESTIONS = [
  {
    title: "OpenAI Project Keys",
    description: "Highly confident, modern OpenAI keys",
    value: "sk-proj-",
    provider: "openai"
  },
  {
    title: "OpenAI Standard Keys",
    description: "Legacy or generic OpenAI keys",
    value: "OPENAI_API_KEY sk-",
    provider: "openai"
  },
  {
    title: "OpenAI Codex Keys",
    description: "OpenAI Codex API keys",
    value: "CODEX_API_KEY sk-",
    provider: "openai"
  },
  {
    title: "AWS Secrets",
    description: "AWS Access Keys & Secrets",
    value: "AKIA AWS_SECRET_ACCESS_KEY",
    provider: "aws"
  },
  {
    title: "GitHub Tokens",
    description: "GitHub Personal Access Tokens",
    value: "ghp_",
    provider: "github"
  },
  {
    title: "GitHub Copilot Tokens",
    description: "GitHub Copilot App/OAuth Tokens",
    value: "ghu_ COPILOT",
    provider: "copilot"
  },
  {
    title: "Anthropic Claude Keys",
    description: "Anthropic API Keys",
    value: "sk-ant-api03-",
    provider: "anthropic"
  },
  {
    title: "Gemini API Keys",
    description: "Google Gemini (Generative AI) Keys",
    value: "GEMINI_API_KEY AIzaSy",
    provider: "gemini"
  },
  {
    title: "Google Cloud Keys",
    description: "General Google Cloud API Keys",
    value: "GOOGLE_API_KEY AIzaSy",
    provider: "google"
  },
  {
    title: "Hugging Face Tokens",
    description: "Hugging Face Access Tokens",
    value: "hf_",
    provider: "huggingface"
  },
  {
    title: "Cursor API Keys",
    description: "Cursor IDE API Keys",
    value: "sk_cursor_",
    provider: "cursor"
  },
  {
    title: "Replicate Tokens",
    description: "Replicate API Tokens",
    value: "r8_",
    provider: "replicate"
  },
  {
    title: "Stripe Live Keys",
    description: "Stripe Live Payment Keys",
    value: "sk_live_",
    provider: "stripe"
  },
  {
    title: "Slack Bot Tokens",
    description: "Slack App/Bot Tokens",
    value: "xoxb-",
    provider: "slack"
  },
  {
    title: "Generic Secrets",
    description: "High entropy strings near keywords",
    value: "SECRET_KEY Bearer",
    provider: "generic"
  }
];
async function suggestCommand() {
  console.log(blue("\n\u{1F4A1} Secret Key Hacker Bot - Interactive Suggestions\n"));
  const response = await prompts([
    {
      type: "select",
      name: "selection",
      message: "Select a target platform to hunt on GitHub:",
      choices: SUGGESTIONS.map((s) => ({ title: s.title, description: s.description, value: s }))
    },
    {
      type: "number",
      name: "limit",
      message: "How many valid keys do you want to find? (Max: 100)",
      initial: 30,
      min: 1,
      max: 100
    },
    {
      type: "confirm",
      name: "execute",
      message: (prev, values) => `Run ${green(`sks hunt "${values.selection.value}" --limit ${values.limit} --provider ${values.selection.provider}`)} now?`,
      initial: true
    }
  ]);
  if (!response.selection) {
    console.log(dim("Canceled."));
    return;
  }
  const { value: query, provider } = response.selection;
  if (response.execute) {
    console.log("");
    await huntCommand(query, { limit: response.limit.toString(), provider });
  } else {
    console.log(`
You can run this manually anytime:
  ${green(`sks hunt "${query}" --limit ${response.limit} --provider ${provider}`)}
`);
  }
}

// src/cli/index.ts
var program = new Command();
program.name("sks").description("\u{1F575}\uFE0F Secret Key Hacker Bot \u2014 Find leaked credentials on GitHub").version("0.1.0");
program.command("hunt").description("Hunt for leaked API keys directly on GitHub Search").argument("<query>", "GitHub search query (e.g. 'OPENAI_API_KEY')").option("--limit <number>", "Max files to scan from search results", "30").option("--provider <name>", "Filter results by provider (e.g. openai, aws)").action(huntCommand);
program.command("suggest").description("Interactive suggestion menu to pick platforms and hunt").action(suggestCommand);
program.parse();
//# sourceMappingURL=index.js.map