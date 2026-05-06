# Secret Key Hacker Bot (`sks`)

A powerful **Bounty Hunter Bot** and CLI tool designed specifically for searching, scraping, and analyzing leaked API keys across **GitHub Search**.

Unlike traditional local repository scanners (like Gitleaks or TruffleHog), **`sks`** is built for **offensive security** and **wide-area reconnaissance**. It crawls GitHub's code search results, pulls the raw source code into memory, and runs a **Confidence-Based Detection Engine** coupled with an **Active Verification Pipeline** to filter out fake keys, dummy placeholders, and expired/dead credentials.

## Features

- **GitHub Hunt**: Search across all of GitHub directly from your terminal (`sks hunt "sk-proj-"`).
- **Active Verification**: Tests potential leaks directly against provider APIs (OpenAI, Anthropic, GitHub, Gemini, Hugging Face) to ensure only live or out-of-quota credentials are reported. Dead keys are automatically dropped.
- **Interactive Suggestions**: Don't know what to search for? Use `sks suggest` to pick from a list of high-value targets (OpenAI, AWS, GitHub PATs, etc.) and the bot will generate the optimal search query.
- **Smart Filtering**: Automatically ignores placeholders (`YOUR_API_KEY_HERE`), comments, test files, and known safe values.
- **High Accuracy**: Combines regex patterns, Shannon entropy checks, and context analysis (e.g. looking for `Authorization:` headers nearby).
- **Major Providers**: Built-in rules for OpenAI, Anthropic, Google/Gemini, AWS, GitHub, GitHub Copilot, Hugging Face, Cursor, Stripe, Slack, and Replicate (includes Codex support via OpenAI rule).
- **Actionable Output**: Provides the exact GitHub URL to the leaked line of code, with the key value securely masked and verification status badged (`[LIVE/WORKING]`).

## Installation

```bash
npm install -g sks
```

### Rate Limits (IMPORTANT)

GitHub severely limits the Search API for unauthenticated users (10 requests per minute).
**You must set a `GITHUB_TOKEN` to use this tool effectively (30 requests per minute).**

```bash
export GITHUB_TOKEN="ghp_your_personal_access_token"
```

## Usage

### 1. Hunt Mode

Hunt for a specific keyword or pattern:

```bash
sks hunt "OPENAI_API_KEY" --limit 50
```

### 2. Suggest Mode (Interactive)

If you want the bot to suggest what to search for:

```bash
sks suggest
```
*(A menu will appear asking which Provider you want to hunt for, and it will automatically run the optimal query).*

### Example Output

```bash
$ sks hunt "sk-proj-" --limit 10

🔍 Hunting GitHub for: sk-proj- (limit: 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 [HIGH] openai key detected [LIVE/WORKING] (score: 100)
   Repo:  vuln-corp/demo-app
   Value: sk-proj-****xyz
   Link:  https://github.com/vuln-corp/demo-app/blob/master/config.ts#L12

✅ Scanned successfully. Found 1 leaked keys.
```

## How It Works

1. **API Crawling**: Calls `GET /search/code` on GitHub.
2. **Raw Extraction**: Fetches the raw file contents (`application/vnd.github.v3.raw`) into memory.
3. **Detection Engine**:
   - Matches against Provider Rules (regex + key name patterns).
   - Analyzes Context (checks surrounding lines for auth patterns).
   - Calculates Shannon Entropy.
4. **Scoring System**: Combines positive signals and subtracts negative signals (Placeholders, Test Files, Comments) to produce a final Score (0-100).
5. **Active Verification**: For high/medium confidence findings, makes a lightweight, non-destructive API call to the target provider. If the key is dead, it is silently dropped.
6. **Reporting**: Masks sensitive values securely, adds badges, and outputs the GitHub HTML link.

## License

MIT
