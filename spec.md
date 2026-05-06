# Technical Specification - Secret Key Scanner (`sks`)

## 1. Tech Stack

| Layer          | Technology               | Lý do chọn                              |
| -------------- | ------------------------ | ---------------------------------------- |
| Language       | TypeScript               | Type safety cho rule engine, DX tốt      |
| Runtime        | Node.js >= 18            | Target audience là JS/TS devs            |
| CLI Framework  | `commander`              | Clean API, lightweight, đủ cho tool CLI  |
| Testing        | Vitest                   | Nhanh, TS-native, config nhẹ            |
| Distribution   | npm                      | npx-first, JS ecosystem                 |
| Git            | Shell out (`git` CLI)    | Optimized (C code), có sẵn trên mọi máy |

### Tại sao không chọn

| Option         | Lý do loại                                          |
| -------------- | --------------------------------------------------- |
| Python         | IO scanning không vượt trội, npm distribution tốt hơn cho target audience |
| JavaScript     | Thiếu type safety, rule engine cần types             |
| oclif          | Quá nặng cho MVP, overhead cao                       |
| yargs          | API messy hơn commander                              |
| simple-git     | Abstraction leak, chậm hơn git CLI                   |
| isomorphic-git | Thiếu feature, chậm                                 |
| Monorepo       | Overkill cho MVP, tăng complexity không cần thiết     |

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  commander → parse args → dispatch to Scanner Engine        │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                     Scanner Engine                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ File Walker   │  │ Candidate    │  │ Git History       │  │
│  │              │  │ Extractor    │  │ Scanner           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘  │
│         │                 │                  │              │
│  ┌──────▼─────────────────▼──────────────────▼───────────┐  │
│  │              Detection Engine                         │  │
│  │                                                       │  │
│  │  ┌────────────┐ ┌──────────┐ ┌───────────────────┐    │  │
│  │  │ Rule Engine │ │ Entropy  │ │ Context Analyzer  │    │  │
│  │  └─────┬──────┘ └────┬─────┘ └─────────┬─────────┘    │  │
│  │        │              │                 │             │  │
│  │  ┌─────▼──────────────▼─────────────────▼─────────┐   │  │
│  │  │           Scoring Engine                       │   │  │
│  │  │  (positive signals + negative signals → score) │   │  │
│  │  └────────────────────┬───────────────────────────┘   │  │
│  │                       │                               │  │
│  │  ┌────────────────────▼───────────────────────────┐   │  │
│  │  │       Deduplicator & Merger                    │   │  │
│  │  │  (merge by value → assign confidence)          │   │  │
│  │  └────────────────────┬───────────────────────────┘   │  │
│  └───────────────────────┼───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Reporter                                │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │ CLI Reporter   │  │ JSON Reporter  │                     │
│  └────────────────┘  └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. CLI parse args (path, flags, config)
       │
2. Load config (--config → CWD → parents → ~/.sksrc)
       │
3. Merge config (deep merge: user > built-in)
       │
4. File Walker: traverse → filter (binary, size, symlink, lockfile)
       │
5. Per file:
   ├── Extract candidate values (after =, in quotes, JSON values)
   ├── Apply rules per candidate:
   │   ├── valuePattern match   → +weight
   │   ├── keyPattern match     → +weight
   │   └── contextPattern match → +weight
   ├── Compute Shannon entropy on value
   │   ├── entropy >= threshold → +weight
   │   └── entropy < threshold  → -20
   ├── Apply negative signals:
   │   ├── Placeholder?    → -60
   │   ├── Test file?      → -20
   │   ├── In comment?     → -10
   │   └── Known safe?     → skip entirely
   └── Calculate final score (capped at 100)
       │
6. (Optional) Git History Scanner:
   ├── git log -p --all --pretty=format:"__COMMIT__%H|%an|%ad"
   ├── Parse diff: both + and - lines
   ├── Apply same detection pipeline
   └── Merge with working tree findings (by value)
       │
7. Deduplicate findings by VALUE
   ├── Group occurrences [{file, line, type}]
   └── Assign confidence (>80=High, 50-80=Medium, <50=Low)
       │
8. Active Verification (for High/Medium confidence)
   ├── Send request to Provider API (OpenAI, GitHub, etc.)
   ├── If status is "dead" or "unknown" → DROP finding entirely
   └── If status is "active" or "quota_exceeded" → TAG finding with badge
       │
9. Mask values (prefix + suffix, configurable)
       │
10. Output (CLI or JSON) + exit code (0/1/2)
```

---

## 3. Detection Engine

### 3.1 Rule Type Definition

```typescript
type Rule = {
  id: string;                    // unique identifier, e.g. "openai-project-key"
  name: string;                  // display name, e.g. "OpenAI Project Key"
  provider: string;              // provider group, e.g. "openai"

  // Detection patterns
  valuePattern?: RegExp;         // regex on the value, e.g. /sk-proj-[A-Za-z0-9]{20,}/
  keyPattern?: RegExp;           // regex on variable name, e.g. /OPENAI_API_KEY/i
  contextPatterns?: RegExp[];    // regex on surrounding lines

  // Scoring weights (per-rule, overridable)
  weight: {
    valueMatch: number;          // default: 60
    keyMatch?: number;           // default: 25
    contextMatch?: number;       // default: 15
    entropy?: number;            // bonus if entropy is high
  };

  // Entropy config (optional per-rule override)
  entropy?: {
    min?: number;                // minimum entropy threshold
    max?: number;                // maximum (for filtering noise)
  };

  // Metadata
  severity: "low" | "medium" | "high" | "critical";
  tags?: string[];               // e.g. ["ai", "cloud", "payment"]

  // File filtering (optional)
  allowInFiles?: RegExp[];       // only scan these files
  denyInFiles?: RegExp[];        // skip these files
};
```

### 3.2 Built-in Rules (MVP)

#### OpenAI

| Rule ID                | valuePattern                       | keyPattern                          |
| ---------------------- | ---------------------------------- | ----------------------------------- |
| `openai-key`           | `/sk-[A-Za-z0-9]{20,}/`           | `/OPENAI_API_KEY\|OPENAI_SECRET_KEY\|CHATGPT_API_KEY/i` |
| `openai-project-key`   | `/sk-proj-[A-Za-z0-9]{20,}/`      | (same)                              |
| `openai-service-key`   | `/sk-svc-[A-Za-z0-9]{20,}/`       | (same)                              |
| `openai-org-key`       | `/sk-org-[A-Za-z0-9]{20,}/`       | (same)                              |

#### Anthropic

| Rule ID                | valuePattern                        | keyPattern                          |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `anthropic-key`        | `/sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/` | `/ANTHROPIC_API_KEY\|CLAUDE_API_KEY\|ANTHROPIC_AUTH_TOKEN/i` |

#### Google / Gemini

| Rule ID                | valuePattern                        | keyPattern                          |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `google-api-key`       | `/AIzaSy[A-Za-z0-9_-]{33}/`        | `/GEMINI_API_KEY\|GOOGLE_API_KEY\|GOOGLE_AI_API_KEY\|MAKERSUITE_API_KEY/i` |

#### AWS

| Rule ID                | valuePattern                        | keyPattern                          |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `aws-access-key`       | `/AKIA[0-9A-Z]{16}/`              | `/AWS_ACCESS_KEY_ID/i`              |
| `aws-secret-key`       | `/[A-Za-z0-9/+=]{40}/`            | `/AWS_SECRET_ACCESS_KEY/i`          |

#### GitHub

| Rule ID                | valuePattern                        | keyPattern                          |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `github-pat`           | `/ghp_[A-Za-z0-9]{36}/`           | `/GITHUB_TOKEN\|GH_TOKEN/i`        |
| `github-oauth`         | `/gho_[A-Za-z0-9]{36}/`           |                                     |
| `github-app`           | `/ghu_[A-Za-z0-9]{36}/`           |                                     |

#### Hugging Face

| Rule ID                | valuePattern                        | keyPattern                          |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `huggingface-token`    | `/hf_[A-Za-z0-9]{34}/`            | `/HF_TOKEN\|HUGGINGFACE_API_KEY/i`  |

#### Replicate

| Rule ID                | valuePattern                        | keyPattern                          |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `replicate-token`      | `/r8_[A-Za-z0-9]{20,}/`           | `/REPLICATE_API_TOKEN\|REPLICATE_API_KEY/i` |

#### Generic

| Rule ID                | valuePattern | keyPattern                                      |
| ---------------------- | ------------ | ----------------------------------------------- |
| `generic-api-key`      | (none)       | `/API_KEY\|SECRET_KEY\|ACCESS_TOKEN\|AUTH_TOKEN\|BEARER_TOKEN\|CLIENT_SECRET/i` |

> Generic rules chỉ có `keyPattern` (không có `valuePattern`), nên weight thấp hơn. Cần entropy + context để đạt high confidence.

---

### 3.3 Entropy Calculation

**Algorithm**: Shannon Entropy

```
H(X) = -Σ p(x) * log2(p(x))
```

| Config           | Value  | Mô tả                        |
| ---------------- | ------ | ----------------------------- |
| Default min      | 4.2    | Generic detection threshold   |
| Strict mode min  | 4.5–5.0| Giảm false positive           |

**Scope**: CHỈ tính trên **extracted value**, KHÔNG tính cả dòng.

**Candidate extraction flow**:
1. Tìm chuỗi sau dấu `=` (assignment)
2. Tìm chuỗi trong quotes (`"..."`, `'...``, `` `...` ``)
3. Tìm JSON string values
4. Handle edge cases: base64 multiline, JWT, hex

---

### 3.4 Scoring System

#### Positive Signals (per-rule baseline)

| Signal         | Default Weight | Mô tả                           |
| -------------- | -------------- | -------------------------------- |
| `valueMatch`   | +60            | Value regex match                |
| `keyMatch`     | +25            | Variable name regex match        |
| `contextMatch` | +15            | Surrounding context regex match  |

#### Negative Signals

| Signal              | Weight | Trigger                                       |
| ------------------- | ------ | --------------------------------------------- |
| Placeholder         | -60    | `YOUR_API_KEY`, `API_KEY_HERE`, `xxx`, `dummy` |
| Test/example file   | -20    | Path contains `/test/`, `/__tests__/`, `/example/`, `/fixtures/` |
| In comment          | -10    | Line starts with `//`, `#`, `/*`, `--`        |
| Low entropy         | -20    | entropy < configured threshold                |
| Known safe          | skip   | `localhost`, `127.0.0.1`, `0.0.0.0` → ignore entirely |

#### Score Aggregation

```
score = Σ(positive_signals) + Σ(negative_signals)
score = Math.min(score, 100)  // cap
score = Math.max(score, 0)    // floor
```

#### Confidence Mapping

| Score Range | Confidence |
| ----------- | ---------- |
| > 80        | `high`     |
| 50–80       | `medium`   |
| < 50        | `low`      |

---

### 3.5 Context Analysis

Check **surrounding lines** (±3 lines from candidate):

```typescript
const contextPatterns: RegExp[] = [
  /Authorization/i,
  /Bearer/i,
  /x-api-key/i,
  /credentials/i,
  /headers?\s*[=:]/i,
  /fetch\s*\(/i,
  /axios/i,
  /request/i,
];
```

---

## 4. Data Models

### 4.1 Finding

```typescript
type Finding = {
  value: string;                 // masked value
  rawValue: string;              // original (internal only, never output)
  confidence: "low" | "medium" | "high";
  score: number;

  providers: string[];           // ["openai", "generic"]
  matches: RuleMatch[];          // all rules that matched

  occurrences: Occurrence[];     // all locations
  sources: ("working_tree" | "history")[];
};

type RuleMatch = {
  ruleId: string;
  signals: {
    valueMatch: boolean;
    keyMatch: boolean;
    contextMatch: boolean;
    entropy: number;
  };
  score: number;
};

type Occurrence = {
  type: "file" | "history";
  file: string;
  line: number;

  // history-only fields
  commit?: string;
  author?: string;
  date?: string;
};
```

### 4.2 Scan Result

```typescript
type ScanResult = {
  meta: {
    scanDate: string;            // ISO 8601
    scanPath: string;
    durationMs: number;
    totalFiles: number;
    scannedFiles: number;
  };

  summary: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };

  findings: Finding[];
};
```

---

## 5. File Scanner

### 5.1 File Walker Behavior

| Behavior             | Default              | Override                    |
| -------------------- | -------------------- | --------------------------- |
| Recursive            | Yes                  | —                           |
| Binary detection     | Skip (null byte `\0` heuristic) | —                 |
| Max file size        | 5 MB                 | `--max-file-size N`         |
| Max line length      | 10,000 chars (skip)  | —                           |
| Max lines per file   | 2,000 (first N lines)| —                           |
| Symlinks             | Skip                 | `--follow-symlinks`         |
| Encoding             | UTF-8                | Fallback: try → skip        |

### 5.2 Default Ignore List

```
node_modules/
dist/
build/
.git/
coverage/
vendor/
__pycache__/
*.lock
package-lock.json
yarn.lock
pnpm-lock.yaml
```

---

## 6. Git History Scanner (V1)

### 6.1 Implementation

```bash
git log -p --all --pretty=format:"__COMMIT__%H|%an|%ad" --max-count=<depth>
```

### 6.2 Parse Strategy

1. Split output by `__COMMIT__` delimiter
2. Extract: `commitHash`, `author`, `date`
3. Parse diff hunks: extract both `+` and `-` lines
4. For each diff line → run through same detection pipeline
5. Merge with working tree findings by VALUE

### 6.3 CLI Flags

| Flag               | Default | Behavior                               |
| ------------------ | ------- | -------------------------------------- |
| (no flag)          | —       | Scan working tree only                 |
| `--history`        | —       | Enable git history scanning            |
| `--history-depth N`| 50      | Limit number of commits to scan        |

---

## 7. Config System

### 7.1 Config File Schema (`sks.config.json`)

```json
{
  "extends": "./base.config.json",

  "rules": {
    "enable": ["openai", "aws"],
    "disable": ["generic"],
    "custom": [
      {
        "id": "my-internal-key",
        "name": "Internal Service Key",
        "provider": "internal",
        "valuePattern": "^int_key_[A-Za-z0-9]{32}$",
        "weight": { "valueMatch": 70 },
        "severity": "critical"
      }
    ]
  },

  "ignore": {
    "paths": ["node_modules", "dist", ".next"],
    "files": ["*.lock", "*.min.js"],
    "patterns": ["YOUR_API_KEY", "dummy", "example"],
    "values": ["AIzaSyPublicKey123"]
  },

  "scoring": {
    "thresholds": {
      "high": 80,
      "medium": 50
    },
    "entropy": {
      "min": 4.2
    }
  },

  "scanning": {
    "maxFileSize": 5242880,
    "maxLineLength": 10000,
    "maxLinesPerFile": 2000,
    "followSymlinks": false
  },

  "history": {
    "enabled": false,
    "depth": 50
  },

  "output": {
    "format": "cli",
    "masking": "partial",
    "showLowConfidence": false
  }
}
```

### 7.2 Config Lookup Order

```
1. --config <path>           (explicit, highest priority)
2. ./sks.config.json         (CWD)
3. ../sks.config.json        (traverse parent directories)
4. ~/.sksrc                  (global, lowest priority)
```

### 7.3 Config Merge Strategy

- **Deep merge** (không overwrite toàn bộ)
- **Priority**: User config > Extended config > Built-in defaults
- Arrays: concatenate (không replace)

---

## 8. CLI Design

### 8.1 Commands

```bash
sks hunt "OPENAI_API_KEY"                 # scan GitHub search results
sks hunt "OPENAI_API_KEY" --limit 50      # scan top 50 files
sks scan <path>                           # scan directory
sks scan <path> --deep                    # alias for --history
sks scan <path> --history                 # scan git history
sks scan <path> --history-depth 100       # limit history depth
sks scan <path> --format json             # JSON output
sks scan <path> --config sks.config.json  # custom config
sks scan <path> --max-file-size 20        # MB
sks scan <path> --follow-symlinks         # follow symlinks
```

### 8.2 Exit Codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| `0`  | Scan completed, no findings            |
| `1`  | Scan completed, findings detected      |
| `2`  | Error (invalid path, config error,...) |

---

## 9. Output Formats

### 9.1 CLI Output (Human-Friendly)

```
🔍 Scanning ./my-project...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 [HIGH] OpenAI Project Key detected (score: 92)
   Value:  sk-proj-****abcd
   Files:
     → src/config.js:12
     → (history) abc1234 config.js:10

🟡 [MEDIUM] Generic API Key detected (score: 65)
   Value:  ****efgh
   Files:
     → .env:3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary: 2 findings (1 high, 1 medium, 0 low)
⏱️  Scanned 980/1234 files in 2.3s
```

**No findings:**

```
🔍 Scanning ./my-project...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ No secrets found
⏱️  Scanned 1234 files in 1.8s
```

### 9.2 JSON Output

```json
{
  "meta": {
    "scanDate": "2026-05-05T10:00:00Z",
    "scanPath": "./my-project",
    "durationMs": 2300,
    "totalFiles": 1234,
    "scannedFiles": 980
  },
  "summary": {
    "high": 1,
    "medium": 1,
    "low": 0,
    "total": 2
  },
  "findings": [
    {
      "value": "sk-proj-****abcd",
      "confidence": "high",
      "score": 92,
      "providers": ["openai"],
      "sources": ["working_tree", "history"],
      "occurrences": [
        {
          "type": "file",
          "file": "src/config.js",
          "line": 12
        },
        {
          "type": "history",
          "commit": "abc1234",
          "author": "John",
          "date": "2025-01-01",
          "file": "config.js",
          "line": 10
        }
      ]
    }
  ]
}
```

---

## 10. Performance Strategy

| Strategy              | Detail                                       |
| --------------------- | -------------------------------------------- |
| Parallel scanning     | Worker threads hoặc async concurrent reads   |
| Streaming read        | Đọc file theo stream, không load toàn bộ     |
| Early termination     | Skip file ngay khi detect binary (null byte) |
| Partial file scan     | Chỉ scan 2000 dòng đầu                      |
| Line length limit     | Skip dòng > 10k chars (minified JS)          |
| File size limit       | Skip file > 5MB (configurable)               |
| Lockfile skip         | Skip `*.lock`, `package-lock.json`           |

---

## 11. Project Structure

```
sks/
├── src/
│   ├── cli/
│   │   ├── index.ts                # CLI entry point
│   │   └── commands/
│   │       └── scan.ts             # scan command handler
│   │
│   ├── core/
│   │   ├── scanner.ts              # main scan orchestrator
│   │   ├── fileWalker.ts           # recursive file traversal
│   │   ├── candidateExtractor.ts   # extract values from lines
│   │   └── verifier.ts             # active verification against APIs
│   │
│   ├── detection/
│   │   ├── ruleEngine.ts           # apply rules to candidates
│   │   ├── entropy.ts              # Shannon entropy calculator
│   │   ├── context.ts              # context line analyzer
│   │   └── scoring.ts              # score aggregation + confidence
│   │
│   ├── rules/
│   │   ├── index.ts                # rule registry + loader
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       ├── google.ts
│   │       ├── aws.ts
│   │       ├── github.ts
│   │       ├── huggingface.ts
│   │       ├── replicate.ts
│   │       └── generic.ts
│   │
│   ├── reporting/
│   │   ├── cliReporter.ts          # human-friendly CLI output
│   │   ├── jsonReporter.ts         # structured JSON output
│   │   └── formatter.ts           # value masking, colors
│   │
│   ├── config/
│   │   ├── loader.ts               # config file lookup + load
│   │   ├── merger.ts               # deep merge logic
│   │   └── schema.ts              # config validation
│   │
│   ├── git/
│   │   ├── historyScanner.ts       # git log shell out + orchestration
│   │   └── gitParser.ts            # parse git log output
│   │
│   ├── utils/
│   │   ├── logger.ts               # logging (masked values only)
│   │   ├── fs.ts                   # file system helpers
│   │   └── constants.ts            # default values, thresholds
│   │
│   └── types/
│       └── index.ts                # shared TypeScript types
│
├── tests/
│   ├── unit/
│   │   ├── entropy.test.ts
│   │   ├── scoring.test.ts
│   │   ├── candidateExtractor.test.ts
│   │   └── ruleEngine.test.ts
│   │
│   ├── integration/
│   │   └── scanner.test.ts         # full scan → snapshot
│   │
│   └── fixtures/
│       ├── valid/                   # files containing fake keys
│       │   ├── openai.env
│       │   ├── aws.js
│       │   └── mixed.ts
│       ├── invalid/                 # clean files (expect 0 findings)
│       │   ├── clean.js
│       │   └── placeholder.ts
│       └── edge/                   # edge cases
│           ├── large-file.txt
│           ├── binary.bin
│           └── minified.min.js
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── sks.config.json                 # example config
└── README.md
```

---

## 12. Testing Strategy

### 12.1 Test Levels

| Level          | Scope                              | Framework     |
| -------------- | ---------------------------------- | ------------- |
| Unit           | entropy, regex, scoring, extractor | Vitest        |
| Integration    | Full scan → snapshot output        | Vitest        |
| Snapshot       | Detect regression khi thay rule    | Vitest inline |
| Benchmark      | Performance (10k files < 5s)       | Custom script |

### 12.2 Fixture-Based Testing

```
tests/fixtures/valid/openai.env:
  OPENAI_API_KEY=sk-proj-fakeKey1234567890abcdefghij
  → expect: 1 finding, confidence: high, provider: openai

tests/fixtures/invalid/placeholder.ts:
  const API_KEY = "YOUR_API_KEY_HERE"
  → expect: 0 findings (or low confidence, filtered)

tests/fixtures/invalid/clean.js:
  const name = "Hello World"
  → expect: 0 findings
```

### 12.3 Accuracy Dataset

- **MVP**: Synthetic dataset (test fixtures)
- **Post-MVP**: Collect real leaked keys từ GitHub (manual curation)
- **Long-term**: Build proprietary benchmark dataset → competitive advantage

---

## 13. Distribution

### 13.1 npm Package

| Field       | Value                                     |
| ----------- | ----------------------------------------- |
| name        | `sks` (fallback: `sks-cli` nếu bị chiếm) |
| bin         | `{ "sks": "./dist/cli/index.js" }`        |
| main        | `./dist/index.js`                         |
| type        | module                                    |
| engines     | `{ "node": ">=18" }`                      |

### 13.2 Install Experience

```bash
# Primary (zero install)
npx sks scan .

# Secondary (global install)
npm install -g sks
sks scan .

# Project dependency
npm install --save-dev sks
```

### 13.3 Versioning (SemVer)

| Change Type                    | Version Bump |
| ------------------------------ | ------------ |
| Bug fix                        | Patch        |
| New provider rule              | Minor        |
| Breaking change (config/output)| Major        |

> Rule updates gộp chung package version (không tách riêng).
