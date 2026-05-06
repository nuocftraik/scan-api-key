import type { ScanConfig } from "../../types/index.js";
import { extractCandidates } from "../../core/candidateExtractor.js";
import { getBuiltinRules } from "../../rules/index.js";
import { applyRules } from "../../detection/ruleEngine.js";
import { calculateEntropy } from "../../detection/entropy.js";
import { analyzeContext } from "../../detection/context.js";
import { calculateScore } from "../../detection/scoring.js";
import { verifyKey } from "../../core/verifier.js";
import { maskValue, red, yellow, green, blue, bold, gray, dim } from "../../reporting/formatter.js";
import { DEFAULT_ENTROPY_MIN } from "../../utils/constants.js";
import ora from "ora";

export interface HuntCommandOptions {
  limit?: string;
  provider?: string;
}

export async function huntCommand(query: string, options: HuntCommandOptions) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(yellow("⚠️ GITHUB_TOKEN environment variable is not set. You will face severe rate limits."));
  }

  const targetLimit = parseInt(options.limit || "30", 10);
  console.log(blue(`\n🔍 Hunting GitHub for: ${bold(query)} (Target: ${targetLimit} valid keys)`));
  console.log(dim("━".repeat(70)));

  const headers: Record<string, string> = {
    "User-Agent": "sks-scanner-bot",
    "Accept": "application/vnd.github.v3+json",
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
      // 1. Search Code (Pagination)
      spinner.text = `Fetching GitHub Search API (Page ${page})...`;
      const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=30&page=${page}`;
      const searchRes = await fetch(searchUrl, { headers });
      
      if (!searchRes.ok) {
        if (searchRes.status === 403 || searchRes.status === 429) {
          spinner.warn(yellow(`⚠️ GitHub API Rate limit hit at page ${page}. Stopping hunt.`));
          break;
        }
        if (searchRes.status === 422) {
          spinner.info(gray(`GitHub limits search to 1000 results (reached at page ${page}). Stopping hunt.`));
          break;
        }
        spinner.fail(`GitHub API error: ${searchRes.statusText}`);
        break;
      }

      const searchData = (await searchRes.json()) as any;
      const items = searchData.items || [];
      
      if (items.length === 0) {
        if (page === 1) {
          spinner.info(green("✅ No files found on GitHub matching the query."));
        } else {
          spinner.info(gray(`No more search results after page ${page - 1}.`));
        }
        break;
      }

      if (page === 1) {
        spinner.succeed(`Found ~${searchData.total_count} raw files on GitHub.`);
        spinner.start(`Hunting until we find ${targetLimit} valid keys...`);
      }

      // 2. Fetch and scan each file
      for (let fileIndex = 0; fileIndex < items.length; fileIndex++) {
        if (totalFindings >= targetLimit) break;
        const item = items[fileIndex];

        const fileUrl = item.url;
        const htmlUrl = item.html_url;
        const repoName = item.repository.full_name;

        spinner.text = `[Page ${page}] Scanning file ${fileIndex + 1}/${items.length} from ${repoName}...`;

        // Fetch raw content
        const contentRes = await fetch(fileUrl, {
          headers: { ...headers, "Accept": "application/vnd.github.v3.raw" },
        });

        if (!contentRes.ok) {
          continue;
        }

        const content = await contentRes.text();
        totalFilesScanned++;
        const lines = content.split(/\r?\n/);

        // 3. Scan lines
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const candidates = extractCandidates(line, i + 1);
          if (candidates.length === 0) continue;

          for (const candidate of candidates) {
            const hasContext = analyzeContext(lines, i);
            let matches = applyRules(candidate, rules, hasContext);
            if (options.provider) {
              matches = matches.filter(m => m.provider.toLowerCase() === options.provider!.toLowerCase());
            }
            if (matches.length === 0) continue;

            const entropy = calculateEntropy(candidate.value);
            const scoreResult = calculateScore({
              matches,
              entropy,
              entropyThreshold: DEFAULT_ENTROPY_MIN,
              filePath: item.path,
              rawLine: candidate.rawLine,
              value: candidate.value,
            });

            if (scoreResult.skip || scoreResult.confidence === "low") continue;

            // Active Verification
            const providerName = matches[0].provider;
            spinner.text = `[Page ${page}] Verifying potential ${providerName} key from ${repoName}...`;
            
            const verifyStatus = await verifyKey(providerName, candidate.value);
            
            // STRICT FILTERING: 
            // If the provider is verifiable (not 'unsupported'), we DROP 'dead' and 'unknown'.
            // Only 'active' and 'quota_exceeded' are allowed through.
            if (verifyStatus !== "unsupported") {
              if (verifyStatus === "dead" || verifyStatus === "unknown") {
                continue; // Drop completely!
              }
            }

            // Found a valid and non-dead leak!
            totalFindings++;
            
            let verifyBadge = "";
            if (verifyStatus === "active") verifyBadge = green(bold(" [LIVE/WORKING]"));
            if (verifyStatus === "quota_exceeded") verifyBadge = yellow(bold(" [OUT_OF_QUOTA]"));

            const icon = scoreResult.confidence === "high" ? "🔴" : "🟡";
            const color = scoreResult.confidence === "high" ? red : yellow;
            const label = `[${scoreResult.confidence.toUpperCase()}]`;
            const providerLabel = [...new Set(matches.map(m => m.provider))].join(", ");

            spinner.stop(); // Stop spinner to print finding clearly
            console.log(`${icon} ${color(bold(label))} ${providerLabel} key detected${verifyBadge} (score: ${scoreResult.score})`);
            console.log(`   Repo:  ${bold(repoName)}`);
            console.log(`   Value: ${bold(candidate.value)}`);
            console.log(`   Link:  ${htmlUrl}#L${candidate.lineNumber}`);
            console.log("");
            spinner.start(); // Restart spinner
            
            if (totalFindings >= targetLimit) break;
          }
          if (totalFindings >= targetLimit) break;
        }
        
        // Delay slightly to respect secondary rate limits
        await new Promise(r => setTimeout(r, 100));
      }

      if (items.length < 30) {
        break; // No more pages
      }
      page++;
    }

    spinner.stop();
    console.log(dim("━".repeat(70)));
    console.log(gray(`Files downloaded and scanned: ${totalFilesScanned}`));
    
    if (totalFindings === 0) {
      console.log(green("✅ Scanned successfully. No valid leaks found (only placeholders/noise)."));
    } else {
      console.log(red(`🚨 Hunt complete! Successfully acquired ${totalFindings} valid keys.`));
    }

  } catch (err) {
    spinner.stop();
    console.error(red(`❌ Hunt failed: ${err instanceof Error ? err.message : String(err)}`));
    process.exitCode = 2;
  }
}
