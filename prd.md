# PRD - Secret Key Scanner (`sks`)

## 1. Overview

**Secret Key Scanner (sks)** là một **confidence-based detection engine** giúp phát hiện API keys, tokens, và credentials bị lộ trong source code.

> ⚠️ Đây **không phải** một "regex grep tool" — mà là một engine phân tích đa tín hiệu (multi-signal), kết hợp regex matching, entropy analysis, và context detection để đưa ra **confidence score** cho mỗi finding.

### Product Identity

| Attribute     | Value                          |
| ------------- | ------------------------------ |
| Tên sản phẩm  | Secret Key Scanner             |
| CLI command   | `sks`                         |
| Ngôn ngữ      | TypeScript (Node.js)          |
| Distribution  | npm (`npx sks scan .`)        |
| License       | TBD                           |

### Mục tiêu cốt lõi

- Phát hiện API key với **độ chính xác cao** (confidence-based, không chỉ regex)
- Giảm **false positive** thông qua negative signals & scoring system
- Tự động hóa việc scan trong **CI/CD pipeline**
- Hỗ trợ nhiều nền tảng AI & cloud (OpenAI, Anthropic, Google, AWS, GitHub,...)

---

## 2. Problem Statement

Developers thường:

- **Hardcode** API key trực tiếp vào source code
- **Commit nhầm** file `.env` lên repository
- **Không nhận ra** key đã bị leak trong git history (đã xóa ở HEAD nhưng vẫn tồn tại trong commit cũ)

Hacker sử dụng bot scan 24/7 trên GitHub/GitLab → **exploit key trong vài phút** sau khi commit.

### Tại sao tool hiện có chưa đủ?

- **Gitleaks/TruffleHog**: Mạnh nhưng config phức tạp, không thân thiện với dev frontend/startup
- **Regex grep đơn thuần**: Quá nhiều false positive, không có scoring
- **GitHub Secret Scanning**: Chỉ hoạt động trên GitHub, không scan local

---

## 3. Goals

### Primary Goals

- Detect API keys với **confidence score** (không chỉ binary match/no-match)
- **False positive rate < 10%** nhờ negative signals (placeholder detection, test file detection,...)
- Scan nhanh: **< 5s cho 10k files**
- **Zero-config experience**: `npx sks scan .` chạy được ngay, không cần setup

### Secondary Goals

- Tích hợp CI/CD (exit code strategy)
- Export report (JSON)
- Hỗ trợ custom rules & config inheritance (`extends`)
- Scan git history để phát hiện key đã bị xóa

---

## 4. Non-Goals

- ❌ Không phải vulnerability scanner full-stack (không scan SQL injection, XSS,...)
- ❌ Không xử lý runtime secrets (chỉ static analysis)
- ❌ Không verify key còn hoạt động hay đã revoke (không gọi API bên ngoài)
- ❌ Không hỗ trợ encrypted repos

---

## 5. Target Users

| Persona                | Pain Point                                | Giá trị `sks` mang lại             |
| ---------------------- | ----------------------------------------- | ----------------------------------- |
| **Frontend/Fullstack** | Hay hardcode key, dùng `.env` không đúng  | Scan nhanh, npm ecosystem quen thuộc |
| **Startup teams**      | Thiếu security layer, không có SOC team   | Zero-config, chạy ngay             |
| **DevOps/SecEng**      | Cần enforce policy trong CI               | Exit code, JSON report, custom rules |

---

## 6. Core Features — Phased Roadmap

### MVP (Milestone 1)

| Feature                        | Mô tả                                                    |
| ------------------------------ | --------------------------------------------------------- |
| Scan local folder              | Recursive scan, auto-detect text files, skip binary       |
| Multi-signal detection         | `valuePattern` + `keyPattern` + `contextPattern`          |
| Entropy analysis               | Shannon entropy trên extracted values (threshold ≥ 4.2)   |
| Confidence scoring             | Score aggregation → High/Medium/Low confidence            |
| Negative signals               | Placeholder detection, test file, comment, low entropy    |
| Deduplication                  | Merge findings theo VALUE, group occurrences              |
| Value masking                  | Default: show prefix + suffix, mask middle                |
| Built-in rules                 | OpenAI, Anthropic, Google, AWS, GitHub, Generic           |
| CLI output                     | Human-friendly format với color coding                    |
| Exit code                      | 0 = clean, 1 = findings, 2 = error                       |

### V1 (Milestone 2)

| Feature                        | Mô tả                                                    |
| ------------------------------ | --------------------------------------------------------- |
| Git history scanning           | Shell out `git log -p`, default depth 50 commits          |
| Custom rule config             | `sks.config.json` với extends support                     |
| Ignore system                  | Ignore paths, files, patterns, values (allowlist)         |
| JSON report                    | Structured output với meta, summary, findings             |
| Config lookup                  | CWD → traverse parents → `~/.sksrc`                      |
| Rule enable/disable            | Per-provider toggle                                       |

### V2 (Milestone 3)

| Feature                        | Mô tả                                                    |
| ------------------------------ | --------------------------------------------------------- |
| CI/CD integration              | GitHub Actions, GitLab CI templates                       |
| Pre-commit hook guide + helper | Husky integration, `npx sks scan . \|\| exit 1`          |
| Dashboard UI                   | Web-based report viewer                                   |
| Alert system                   | Notification khi phát hiện leak                           |

---

## 7. Success Metrics

| Metric                 | Target     | Cách đo                              |
| ---------------------- | ---------- | ------------------------------------- |
| Detection accuracy     | > 90%      | Synthetic dataset + known leak corpus |
| False positive rate    | < 10%      | Test fixtures (clean files)           |
| Scan speed             | < 5s/10k   | Benchmark trên real repos             |
| Install-to-first-scan  | < 30s      | `npx sks scan .` cold start          |

---

## 8. Risks & Mitigations

| Risk                           | Impact | Mitigation                                 |
| ------------------------------ | ------ | ------------------------------------------ |
| False positives gây khó chịu   | High   | Negative signals, tunable thresholds       |
| Miss key → mất trust           | High   | Multi-signal detection, entropy fallback   |
| Performance khi scan repo lớn  | Medium | Streaming, file size limit, line limit     |
| npm package name bị chiếm      | Low    | Fallback: `sks-cli`                        |

---

## 9. Triết lý thiết kế

1. **Confidence over binary**: Mọi finding đều có score, không chỉ "found/not found"
2. **Signal composition**: Nhiều tín hiệu yếu kết hợp = 1 tín hiệu mạnh
3. **Noise reduction là feature**: Negative signals quan trọng không kém positive
4. **npx-first**: User phải scan được trong 1 lệnh, không cần install
5. **Convention over configuration**: Hoạt động tốt với zero config, mở rộng khi cần

---

## 10. Future Vision

- **SaaS platform**: Scan repo online, hosted dashboard
- **Pay-per-scan model**: Monetization cho enterprise
- **Security scoring system**: Chấm điểm bảo mật tổng thể cho repo
- **Rule marketplace**: Community-contributed rules
