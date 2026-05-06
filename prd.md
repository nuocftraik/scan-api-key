# PRD - Secret Key Hacker Bot (`sks`)

## 1. Overview

**Secret Key Hacker Bot (sks)** là một **confidence-based detection bot** hoạt động hoàn toàn trên môi trường public (GitHub, GitLab). Nó đóng vai trò như một thợ săn tiền thưởng (Bounty Hunter Bot), giúp rà quét các mã nguồn bị rò rỉ trên internet.

> ⚠️ Đây **không phải** một công cụ scan local repo thông thường. Nó sinh ra để tự động hóa việc crawl tìm kiếm các mã nguồn công khai, sau đó chấm điểm (confidence score) để lọc ra Key thật.

### Product Identity

| Attribute     | Value                          |
| ------------- | ------------------------------ |
| Tên sản phẩm  | Secret Key Hacker Bot          |
| CLI command   | `sks hunt`                     |
| Ngôn ngữ      | TypeScript (Node.js)          |
| Target        | Public Repositories (GitHub)   |

### Mục tiêu cốt lõi

- **GitHub/GitLab Hunt**: Tự động crawl kết quả tìm kiếm và scan trực tiếp trên memory.
- **Provider Suggestions**: Gợi ý các từ khóa (keywords, patterns) của các nền tảng AI/Cloud phổ biến nhất để user không cần nhớ cú pháp search.
- Phát hiện API key với **độ chính xác cao** (confidence-based, lọc rác).

---

## 2. Problem Statement

Hacker sử dụng bot scan 24/7 trên GitHub/GitLab → **exploit key trong vài phút** sau khi một lập trình viên vô tình public code.
Bounty Hunters/Security Researchers cần một tool để tự động hóa quá trình săn lỗi này thay vì lên GitHub search tay và tải từng file về kiểm tra.

### Tại sao tool hiện có chưa đủ?

- **Gitleaks/TruffleHog**: Mạnh nhưng chỉ thiết kế để scan local repo. Không có khả năng crawl từ GitHub Search.
- **GitHub Secret Scanning**: Chỉ cảnh báo cho chủ repo, không dành cho security researchers bên thứ 3.
- **Regex grep đơn thuần**: Quá nhiều false positive, không thể phân biệt giữa key thật và fake placeholder (`YOUR_KEY_HERE`).

---

## 3. Goals

### Primary Goals

- **Hunt Command**: Hỗ trợ crawl và scan trực tiếp từ kết quả search của GitHub API (`sks hunt`).
- **Interactive Suggestions**: Cung cấp command `sks suggest` hoặc prompt tương tác để chọn Provider (OpenAI, AWS...) và tự sinh query search.
- Detect API keys với **confidence score**.
- **False positive rate < 10%** nhờ negative signals.

---

## 4. Non-Goals

- ❌ Không scan local repo (không cần thiết vì đã có code trên máy thì không gọi là "săn" leak).
- ❌ Không phải vulnerability scanner full-stack.
- ❌ Không verify key còn hoạt động hay đã revoke bằng cách call thử API thực tế (tránh bị block).

---

## 5. Target Users

| Persona                | Giá trị `sks` mang lại             |
| ---------------------- | ----------------------------------- |
| **Bounty Hunters**     | Bot tự động tìm kiếm, tải code và chấm điểm confidence, lọc rác. Cung cấp sẵn kho keyword béo bở. |
| **Security Researchers** | Dễ dàng tracking các xu hướng rò rỉ secret của một nền tảng cụ thể. |

---

## 6. Core Features — Phased Roadmap

### MVP (Milestone 1)

| Feature                        | Mô tả                                                    |
| ------------------------------ | --------------------------------------------------------- |
| **GitHub Search Hunt**         | Tìm kiếm qua GitHub API, tải file và scan (`sks hunt`)    |
| **Interactive Suggestions**    | Gợi ý các query search ngon ăn cho các provider phổ biến |
| Multi-signal detection         | `valuePattern` + `keyPattern` + `contextPattern`          |
| Entropy analysis               | Shannon entropy trên extracted values                     |
| Confidence scoring             | Score aggregation → High/Medium/Low confidence            |
| Negative signals               | Lọc Placeholder, test file, comment, low entropy          |

### V1 (Milestone 2)

| Feature                        | Mô tả                                                    |
| ------------------------------ | --------------------------------------------------------- |
| GitLab Search Integration      | Thêm module crawl mã nguồn từ GitLab API                  |
| Scheduled Bot                  | Bot chạy ngầm, cronjob 5 phút/lần báo kết quả qua Discord |
| Automated Notification         | Push webhook khi có High Confidence leak                  |

---

## 7. Success Metrics

| Metric                 | Target     | Cách đo                              |
| ---------------------- | ---------- | ------------------------------------- |
| Detection accuracy     | > 90%      | Dựa trên tập kết quả Github           |
| False positive rate    | < 10%      | Lọc được các dummy/placeholder repo   |

---

## 8. Triết lý thiết kế

1. **Hunting First**: Không scan local. Sinh ra là để quét diện rộng trên public networks.
2. **Confidence over binary**: Mọi finding đều có score, không chỉ "found/not found".
3. **Noise reduction là feature**: Negative signals quan trọng không kém positive.
4. **Knowledge embedded**: Tool phải biết sẵn các pattern của AWS, OpenAI để gợi ý cho user.
