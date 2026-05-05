# Requirements - Secret Key Scanner (`sks`)

## 1. Functional Requirements

### FR1 — File Scanning

| ID     | Requirement                                              | Priority |
| ------ | -------------------------------------------------------- | -------- |
| FR1.1  | System PHẢI scan local directories recursively           | Must     |
| FR1.2  | System PHẢI auto-detect text files (không whitelist ext) | Must     |
| FR1.3  | System PHẢI skip binary files (detect via null byte)     | Must     |
| FR1.4  | System PHẢI skip files > 5MB (default, configurable)     | Must     |
| FR1.5  | System PHẢI skip lines > 10k characters                  | Must     |
| FR1.6  | System PHẢI skip symlinks by default                     | Must     |
| FR1.7  | System NÊN support `--follow-symlinks` flag              | Should   |
| FR1.8  | System PHẢI skip lockfiles (`package-lock.json`, `yarn.lock`) | Must |
| FR1.9  | System NÊN giới hạn scan 2000 dòng đầu mỗi file (performance) | Should |
| FR1.10 | System PHẢI hiển thị warning khi skip file (size/binary) | Must     |
| FR1.11 | System PHẢI support `--max-file-size N` override         | Must     |

### Encoding

| ID     | Requirement                               | Priority |
| ------ | ----------------------------------------- | -------- |
| FR1.12 | Default encoding: UTF-8                   | Must     |
| FR1.13 | Fallback: try decode, fail → skip silently | Should  |

---

### FR2 — Secret Detection (Multi-Signal)

#### FR2.1 — Value Pattern Detection

| ID      | Requirement                                                | Priority |
| ------- | ---------------------------------------------------------- | -------- |
| FR2.1.1 | System PHẢI detect secrets bằng `valuePattern` (regex trên giá trị) | Must |
| FR2.1.2 | System PHẢI hỗ trợ predefined patterns cho: OpenAI, Anthropic, Google, AWS, GitHub, Hugging Face, Replicate, Cohere, Mistral, xAI | Must |
| FR2.1.3 | System PHẢI hỗ trợ generic patterns (API_KEY, SECRET_KEY, ACCESS_TOKEN,...) | Must |

#### FR2.2 — Key Pattern Detection

| ID      | Requirement                                                   | Priority |
| ------- | ------------------------------------------------------------- | -------- |
| FR2.2.1 | System PHẢI detect variable/env names bằng `keyPattern`       | Must     |
| FR2.2.2 | Khi cả `keyPattern` + `valuePattern` match → confidence rất cao | Must   |

#### FR2.3 — Context Detection

| ID      | Requirement                                                   | Priority |
| ------- | ------------------------------------------------------------- | -------- |
| FR2.3.1 | System PHẢI check surrounding lines cho `contextPatterns`     | Must     |
| FR2.3.2 | Context patterns bao gồm: `Authorization`, `Bearer`, `header`, `credentials` | Must |

---

### FR3 — Entropy Analysis

| ID    | Requirement                                                  | Priority |
| ----- | ------------------------------------------------------------ | -------- |
| FR3.1 | System PHẢI tính Shannon entropy CHỈ trên extracted value (không phải cả dòng) | Must |
| FR3.2 | Default threshold: `entropy.min = 4.2`                       | Must     |
| FR3.3 | Strict mode threshold: `4.5–5.0` (configurable)             | Should   |

#### Candidate Extraction

| ID    | Requirement                                            | Priority |
| ----- | ------------------------------------------------------ | -------- |
| FR3.4 | Extract value sau dấu `=`                              | Must     |
| FR3.5 | Extract value trong quotes (`"..."`, `'...'`)          | Must     |
| FR3.6 | Extract JSON values                                    | Must     |
| FR3.7 | Handle edge cases: base64 multiline, JWT, hex strings  | Should   |

---

### FR4 — Scoring System

#### FR4.1 — Positive Signals (Baseline)

| Signal         | Default Weight | Mô tả                         |
| -------------- | -------------- | ------------------------------ |
| `valuePattern` | +60            | Regex match trên giá trị       |
| `keyPattern`   | +25            | Regex match trên tên biến      |
| `context`      | +15            | Match context patterns         |

> Weight là **per-rule configurable**, không phải global hardcode.

#### FR4.2 — Negative Signals (BẮT BUỘC)

| Signal                       | Weight | Ví dụ                                  |
| ---------------------------- | ------ | --------------------------------------- |
| Placeholder detection        | -60    | `YOUR_API_KEY`, `API_KEY_HERE`          |
| Test/example file            | -20    | `/test/`, `/__tests__/`, `/example/`    |
| Comment detection            | -10    | `// sk-abc123`                          |
| Low entropy                  | -20    | entropy < threshold                     |
| Known safe patterns          | ignore | `localhost`, `127.0.0.1` → skip hoàn toàn |

#### FR4.3 — Score Aggregation

| ID      | Requirement                                        | Priority |
| ------- | -------------------------------------------------- | -------- |
| FR4.3.1 | Score = sum(positive signals) + sum(negative signals) | Must   |
| FR4.3.2 | Max score cap: 100                                 | Must     |
| FR4.3.3 | Confidence mapping: >80 = High, 50–80 = Medium, <50 = Low | Must |

---

### FR5 — Deduplication & Merging

| ID    | Requirement                                                         | Priority |
| ----- | ------------------------------------------------------------------- | -------- |
| FR5.1 | Deduplicate theo **VALUE** (không phải theo dòng)                   | Must     |
| FR5.2 | Nếu key xuất hiện N lần → 1 finding, N occurrences                 | Must     |
| FR5.3 | Khi 1 dòng match nhiều rules → merge thành 1 finding               | Must     |
| FR5.4 | Finding phải chứa danh sách tất cả matched rules                   | Must     |
| FR5.5 | Finding phải chứa danh sách tất cả matched providers               | Must     |

---

### FR6 — Reporting & Output

#### CLI Output

| ID    | Requirement                                          | Priority |
| ----- | ---------------------------------------------------- | -------- |
| FR6.1 | Default output: human-friendly CLI format            | Must     |
| FR6.2 | Color coding theo confidence level                   | Should   |
| FR6.3 | Khi không có findings: hiển thị `✅ No secrets found` | Must    |

#### JSON Output

| ID    | Requirement                                          | Priority |
| ----- | ---------------------------------------------------- | -------- |
| FR6.4 | Support `--format json`                              | Must     |
| FR6.5 | JSON phải chứa: `meta`, `summary`, `findings`       | Must     |
| FR6.6 | `meta` bao gồm: scanDate, scanPath, durationMs, totalFiles, scannedFiles | Must |

#### Value Masking

| ID    | Requirement                                                      | Priority |
| ----- | ---------------------------------------------------------------- | -------- |
| FR6.7 | Default: partial masking (show prefix 4–6 chars + suffix 2–4 chars) | Must  |
| FR6.8 | Configurable: `"partial"` / `"full"` / `"none"`                 | Must     |
| FR6.9 | Default KHÔNG BAO GIỜ hiển thị full value                       | Must     |

#### Exit Codes (CI-Critical)

| Exit Code | Meaning     |
| --------- | ----------- |
| `0`       | No findings |
| `1`       | Có findings |
| `2`       | Error       |

---

### FR7 — Configurable Rules

| ID    | Requirement                                          | Priority |
| ----- | ---------------------------------------------------- | -------- |
| FR7.1 | User có thể define custom rules (regex)              | Must     |
| FR7.2 | User có thể enable/disable built-in rules by provider | Must    |
| FR7.3 | User rules **override** built-in rules (ưu tiên cao hơn) | Must |

---

### FR8 — Ignore System

| ID    | Requirement                                          | Priority |
| ----- | ---------------------------------------------------- | -------- |
| FR8.1 | Ignore specific paths (`node_modules`, `dist`, `build`) | Must  |
| FR8.2 | Ignore file patterns (`*.lock`)                      | Must     |
| FR8.3 | Ignore string patterns (`YOUR_API_KEY`, `dummy`)     | Must     |
| FR8.4 | Allowlist specific values (`ignore.values`)          | Must     |

---

### FR9 — Config File

| ID    | Requirement                                           | Priority |
| ----- | ----------------------------------------------------- | -------- |
| FR9.1 | Support `sks.config.json` config file                 | Must     |
| FR9.2 | Support `extends` (config inheritance)                | Must     |
| FR9.3 | Config lookup: `--config` → CWD → parent dirs → `~/.sksrc` | Must |
| FR9.4 | Config merge strategy: deep merge (không overwrite toàn bộ) | Must |

---

### FR10 — Git History Scanning (V1)

| ID     | Requirement                                           | Priority |
| ------ | ----------------------------------------------------- | -------- |
| FR10.1 | Shell out `git log -p` (không dùng JS git library)    | Must     |
| FR10.2 | Default: chỉ scan HEAD (working tree)                 | Must     |
| FR10.3 | `--history` flag enable git history scanning          | Must     |
| FR10.4 | `--history-depth N` giới hạn commits (default: 50)    | Must     |
| FR10.5 | Scan cả `+` (added) và `-` (removed) lines trong diff | Must    |
| FR10.6 | History findings chứa: commit hash, author, date, file, line | Must |
| FR10.7 | Merge history findings với working tree findings (by value) | Must |
| FR10.8 | Finding phải chứa `sources: ["working_tree", "history"]` | Must  |

---

## 2. Non-Functional Requirements

### NFR1 — Performance

| ID     | Requirement                                       | Target        |
| ------ | ------------------------------------------------- | ------------- |
| NFR1.1 | Scan 10k files                                    | < 5 seconds   |
| NFR1.2 | Parallel file scanning                            | Required      |
| NFR1.3 | Streaming read (không load full file vào memory)  | Required      |
| NFR1.4 | File size limit (default 5MB)                     | Configurable  |
| NFR1.5 | Line length limit (skip > 10k chars)              | Required      |
| NFR1.6 | Partial file scan (first 2000 lines)              | Recommended   |

### NFR2 — Accuracy

| ID     | Requirement                | Target |
| ------ | -------------------------- | ------ |
| NFR2.1 | Detection accuracy         | > 90%  |
| NFR2.2 | False positive rate        | < 10%  |

### NFR3 — Scalability

| ID     | Requirement                       |
| ------ | --------------------------------- |
| NFR3.1 | Handle large repos (> 1GB)        |
| NFR3.2 | Handle monorepos (nhiều packages) |

### NFR4 — Usability

| ID     | Requirement                                    |
| ------ | ---------------------------------------------- |
| NFR4.1 | `npx sks scan .` chạy được ngay (zero-config)  |
| NFR4.2 | Install-to-first-scan < 30 seconds             |
| NFR4.3 | Clear, human-friendly CLI output               |
| NFR4.4 | Helpful error messages                         |

### NFR5 — Security

| ID     | Requirement                                            |
| ------ | ------------------------------------------------------ |
| NFR5.1 | **KHÔNG** gửi data ra bên ngoài (100% local scan)      |
| NFR5.2 | **KHÔNG** log sensitive values (chỉ log masked values) |
| NFR5.3 | Default masking cho tất cả output                      |

---

## 3. Constraints

| Constraint          | Detail                                |
| ------------------- | ------------------------------------- |
| Runtime             | Node.js >= 18                         |
| Language            | TypeScript                            |
| CLI Framework       | `commander`                           |
| Testing             | Vitest                                |
| Distribution        | npm (npx-first)                       |
| Cross-platform      | Windows, macOS, Linux                 |
| Git dependency      | Requires `git` CLI for history scan   |

---

## 4. Assumptions

- User có quyền truy cập source code trên local machine
- Repository không bị encrypt
- `git` CLI đã được cài đặt (cho history scanning feature)
- File system hỗ trợ UTF-8

---

## 5. Dependencies

| Dependency          | Purpose                           |
| ------------------- | --------------------------------- |
| Node.js fs/path     | File system traversal             |
| `commander`         | CLI argument parsing              |
| `child_process`     | Shell out `git` commands          |
| RegExp engine       | Pattern matching                  |

---

## 6. Acceptance Criteria

### MVP Acceptance

| #  | Criteria                                                      | Verification         |
| -- | ------------------------------------------------------------- | -------------------- |
| 1  | `npx sks scan .` chạy thành công trên folder bất kỳ          | Manual test          |
| 2  | Detect ít nhất 5 loại provider keys (OpenAI, Anthropic, Google, AWS, GitHub) | Test fixtures |
| 3  | Output hiển thị confidence level (High/Medium/Low)            | Snapshot test        |
| 4  | False positive rate < 10% trên test fixtures                  | Automated test       |
| 5  | Scan 10k files < 5 seconds                                   | Benchmark            |
| 6  | Exit code 0 khi clean, 1 khi có findings                     | CI test              |
| 7  | Placeholder values (`YOUR_API_KEY`) KHÔNG trigger high confidence | Test fixture      |
| 8  | Binary files được skip tự động                                | Test fixture         |
| 9  | Value masking hoạt động đúng trong output                     | Manual verify        |
| 10 | Không crash với repo > 1GB                                    | Stress test          |

### V1 Acceptance

| #  | Criteria                                                      |
| -- | ------------------------------------------------------------- |
| 11 | `sks scan . --history` detect key trong git history           |
| 12 | `sks.config.json` được load và apply đúng                    |
| 13 | Custom rules override built-in rules                         |
| 14 | `--format json` output valid JSON với meta + summary         |
| 15 | Config `extends` hoạt động đúng (deep merge)                 |
