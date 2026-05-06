# Progress Tracking — Secret Key Hacker Bot (`sks`)

> Last updated: 2026-05-06

## Status Summary

| Phase | Name                          | Status      |
| ----- | ----------------------------- | ----------- |
| 0     | Project Bootstrap             | ✅ Complete  |
| 1     | Core Utilities & Constants    | ✅ Complete  |
| 2     | Candidate Extractor           | ✅ Complete  |
| 3     | Detection Engine              | ✅ Complete  |
| 4     | GitHub Hunt Scanner           | ✅ Complete  |
| 5     | Reporting & Value Masking     | ✅ Complete  |
| 6     | CLI Layer                     | ✅ Complete  |
| 7     | Provider Suggestions (UI)     | ✅ Complete  |
| 8     | Active Verification Engine    | ✅ Complete  |

---

## Decisions Made

| #  | Decision                        | Value                    | Date       |
| -- | ------------------------------- | ------------------------ | ---------- |
| 1  | Product Scope                   | GitHub Hunt (No Local)   | 2026-05-06 |
| 2  | Interactive CLI                 | `@inquirer/prompts`      | 2026-05-06 |
| 3  | Active Verification Strategy    | Drop `dead`/`unknown`    | 2026-05-06 |

---

## Phase Log

### Phase 0-3 — Core Detection Engine
- **Files**: `extractor`, `entropy`, `context`, `ruleEngine`, `scoring`
- **Verified**: ✅

---

### Phase 4 — GitHub Hunt Scanner
- **Started**: 2026-05-06
- **Files created**:
  - [x] `src/cli/commands/hunt.ts`
- **Verified**: ✅

---

### Phase 5-6 — CLI & Reporting
- **Files**: `cliReporter`, `formatter`, `index.ts`
- **Verified**: ✅

---

### Phase 7 — Provider Suggestions (UI)
- **Started**: 2026-05-06
- **Tasks**:
  - [x] Thêm thư viện `prompts`
  - [x] Implement `sks suggest` (hiển thị menu chọn platform)
  - [x] Fix lỗi exit code ở `hunt.ts` (khi API lỗi)
- **Verified**: ✅

---

### Phase 8 — Active Verification Engine
- **Started**: 2026-05-06
- **Tasks**:
  - [x] Create `src/core/verifier.ts`
  - [x] Implement validation for OpenAI, Anthropic, GitHub, Gemini, HuggingFace
  - [x] Integrate into `hunt.ts` scanning loop
  - [x] Filter out `dead` and `unknown` credentials
  - [x] Display `[LIVE/WORKING]` and `[OUT_OF_QUOTA]` badges
- **Verified**: ✅
