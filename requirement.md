# Requirements - Secret Key Hacker Bot (`sks`)

## 1. Functional Requirements

### FR1 — GitHub Search Hunt

| ID     | Requirement                                              | Priority |
| ------ | -------------------------------------------------------- | -------- |
| FR1.1  | System PHẢI cho phép search GitHub API qua `sks hunt <query>` | Must     |
| FR1.2  | System PHẢI hỗ trợ GitHub Token qua ENV (`GITHUB_TOKEN`) để tăng rate limit | Must |
| FR1.3  | System PHẢI tải raw content của các file search được     | Must     |
| FR1.4  | System PHẢI hỗ trợ `--limit N` để giới hạn số file tải về | Must     |
| FR1.5  | System PHẢI truyền raw content vào Detection Engine      | Must     |
| FR1.6  | System PHẢI hiển thị link Github trực tiếp tới line bị leak | Must |

---

### FR2 — Interactive Provider Suggestions

| ID     | Requirement                                              | Priority |
| ------ | -------------------------------------------------------- | -------- |
| FR2.1  | Lệnh `sks suggest` PHẢI liệt kê các AI/Cloud Providers phổ biến | Must |
| FR2.2  | System PHẢI cung cấp query search ngon ăn nhất cho mỗi Provider | Must |
| FR2.3  | System NÊN cho phép chọn Provider và tự động chạy `hunt` luôn | Should |

---

### FR3 — Secret Detection (Multi-Signal)

#### FR3.1 — Value Pattern Detection

| ID      | Requirement                                                | Priority |
| ------- | ---------------------------------------------------------- | -------- |
| FR3.1.1 | System PHẢI detect secrets bằng `valuePattern` (regex trên giá trị) | Must |
| FR3.1.2 | System PHẢI hỗ trợ predefined patterns cho: OpenAI, Anthropic, Google, AWS, GitHub, Hugging Face, Replicate | Must |
| FR3.1.3 | System PHẢI hỗ trợ generic patterns (API_KEY, SECRET_KEY, ACCESS_TOKEN,...) | Must |

#### FR3.2 — Key Pattern & Context Detection

| ID      | Requirement                                                   | Priority |
| ------- | ------------------------------------------------------------- | -------- |
| FR3.2.1 | System PHẢI detect variable/env names bằng `keyPattern`       | Must     |
| FR3.2.2 | System PHẢI check surrounding lines cho `contextPatterns` (`Authorization`, `Bearer`, v.v.) | Must |

---

### FR4 — Entropy Analysis

| ID    | Requirement                                                  | Priority |
| ----- | ------------------------------------------------------------ | -------- |
| FR4.1 | System PHẢI tính Shannon entropy CHỈ trên extracted value    | Must |
| FR4.2 | Default threshold: `entropy.min = 4.2`                       | Must     |

---

### FR5 — Scoring System

| ID      | Requirement                                        | Priority |
| ------- | -------------------------------------------------- | -------- |
| FR5.1   | Tăng điểm nếu có Value, Key, Context match         | Must     |
| FR5.2   | Trừ cực mạnh điểm nếu là Placeholder (`YOUR_API_KEY`) | Must |
| FR5.3   | Trừ điểm nếu code nằm trong thư mục test/example   | Must     |
| FR5.4   | Trừ điểm nếu value bị comment                      | Must     |
| FR5.5   | Phân loại: >80 = High, 50-80 = Medium, <50 = Low   | Must     |

---

### FR6 — Reporting & Output

| ID    | Requirement                                                      | Priority |
| ----- | ---------------------------------------------------------------- | -------- |
| FR6.1 | Default output: human-friendly CLI format                        | Must     |
| FR6.2 | Color coding theo confidence level                               | Should   |
| FR6.3 | Default: partial masking (show prefix 4–6 chars + suffix 2–4 chars) | Must  |

---

### FR7 — Active Verification

| ID    | Requirement                                                      | Priority |
| ----- | ---------------------------------------------------------------- | -------- |
| FR7.1 | System PHẢI có khả năng gửi request xác thực key tới API thực tế (OpenAI, GitHub, Gemini, Anthropic, HuggingFace) | Must     |
| FR7.2 | System PHẢI loại bỏ hoàn toàn các key có status là `dead` hoặc `unknown` | Must     |
| FR7.3 | System PHẢI giữ lại và gắn badge cho các key `active` (LIVE/WORKING) hoặc `quota_exceeded` (OUT_OF_QUOTA) | Must     |
| FR7.4 | System KHÔNG ĐƯỢC chặn luồng nếu một key không hỗ trợ verify (`unsupported`) | Must     |

---

## 2. Constraints

| Constraint          | Detail                                |
| ------------------- | ------------------------------------- |
| Runtime             | Node.js >= 18                         |
| Language            | TypeScript                            |
| CLI Framework       | `commander` + `inquirer` (hoặc `prompts` cho UI) |
| API Dependency      | GitHub REST API                       |

---

## 3. Assumptions

- User muốn scan trên public repositories.
- Code bị leak chưa bị xóa (nếu xóa rồi thì GitHub Search API vẫn có thể index nhưng tải raw sẽ lỗi 404 - bot cần tự handle).

---

## 4. Acceptance Criteria

| #  | Criteria                                                      |
| -- | ------------------------------------------------------------- |
| 1  | `sks hunt "sk-proj-"` chạy và in ra file bị leak kèm link url |
| 2  | Lỗi Unauthorized/Rate Limit được catch và cảnh báo rõ ràng    |
| 3  | Lệnh `sks suggest` (hoặc `sks`) hiển thị danh sách các platform để chọn |
| 4  | Các file rác chứa chữ `YOUR_API_KEY_HERE` không bị report là High Confidence |
