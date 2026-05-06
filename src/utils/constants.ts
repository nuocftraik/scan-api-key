// ─── Default Thresholds ──────────────────────────────────────

export const DEFAULT_ENTROPY_MIN = 4.5;

export const DEFAULT_SCORE_HIGH = 80;
export const DEFAULT_SCORE_MEDIUM = 50;
export const MAX_SCORE = 100;

// ─── Default Limits ──────────────────────────────────────────

/** 5 MB in bytes */
export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const DEFAULT_MAX_LINE_LENGTH = 10_000;
export const DEFAULT_MAX_LINES_PER_FILE = 2_000;

// ─── Default Ignore Paths ────────────────────────────────────

export const DEFAULT_IGNORE_PATHS: string[] = [
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
  ".idea",
];

export const DEFAULT_IGNORE_FILES: string[] = [
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.min.js",
  "*.min.css",
  "*.map",
];

// ─── Placeholder Patterns (Negative Signals) ────────────────

export const PLACEHOLDER_PATTERNS: RegExp[] = [
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
  /^<.+>$/,              // <YOUR_KEY>
  /^\{.+\}$/,            // {YOUR_KEY}
  /your[_-]/i,
  /\.\.\.$/,             // ends with ...
  /\*\*\*+$/,            // ends with ***
  /[.]{3,}/,             // ... anywhere
  /[*]{3,}/,             // *** anywhere
  /123456789/,           // simple sequences
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
  /xxxxxxxxxxxxxxxx/i,
];

// ─── Known Safe Values (Skip Entirely) ───────────────────────

export const KNOWN_SAFE_PATTERNS: RegExp[] = [
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
  /^\d+$/,                // pure numbers
];

// ─── Test / Example File Patterns ────────────────────────────

export const TEST_FILE_PATTERNS: RegExp[] = [
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
  /\.example\./i,
];

// ─── Comment Prefixes ────────────────────────────────────────

export const COMMENT_PREFIXES: string[] = [
  "//",
  "#",
  "--",
  "/*",
  "*",
  "<!--",
  "rem ",
];

// ─── Negative Signal Weights ─────────────────────────────────

export const NEGATIVE_WEIGHTS = {
  placeholder: -60,
  testFile: -20,
  comment: -10,
  lowEntropy: -20,
} as const;

// ─── Default Scoring Weights ─────────────────────────────────

export const DEFAULT_WEIGHTS = {
  valueMatch: 60,
  keyMatch: 25,
  contextMatch: 15,
} as const;

// ─── Context Patterns ────────────────────────────────────────

export const DEFAULT_CONTEXT_PATTERNS: RegExp[] = [
  /Authorization/i,
  /Bearer/i,
  /x-api-key/i,
  /credentials/i,
  /headers?\s*[=:({]/i,
  /fetch\s*\(/i,
  /axios/i,
  /\.request\s*\(/i,
  /api[_-]?endpoint/i,
  /secret/i,
];
