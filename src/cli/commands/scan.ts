import * as fs from "node:fs";
import * as path from "node:path";
import type { ScanConfig } from "../../types/index.js";
import { scan } from "../../core/scanner.js";
import { reportCli } from "../../reporting/cliReporter.js";
import { reportJson } from "../../reporting/jsonReporter.js";

export interface ScanCommandOptions {
  format?: string;
  maxFileSize?: string;
  followSymlinks?: boolean;
  showLow?: boolean;
}

/**
 * Handler for the `sks scan <path>` command.
 */
export async function scanCommand(
  targetPath: string,
  options: ScanCommandOptions,
): Promise<void> {
  // Validate path
  const absolutePath = path.resolve(targetPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Path does not exist: ${targetPath}`);
    process.exit(2);
  }

  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    console.error(`❌ Path is not a directory: ${targetPath}`);
    process.exit(2);
  }

  // Build config from CLI options
  const config: Partial<ScanConfig> = {};

  if (options.format) {
    if (options.format !== "cli" && options.format !== "json") {
      console.error(`❌ Invalid format: ${options.format}. Use "cli" or "json".`);
      process.exit(2);
    }
    config.format = options.format as "cli" | "json";
  }

  if (options.maxFileSize) {
    const mb = parseInt(options.maxFileSize, 10);
    if (isNaN(mb) || mb <= 0) {
      console.error(`❌ Invalid max-file-size: ${options.maxFileSize}`);
      process.exit(2);
    }
    config.maxFileSize = mb * 1024 * 1024;
  }

  if (options.followSymlinks) {
    config.followSymlinks = true;
  }

  if (options.showLow) {
    config.showLowConfidence = true;
  }

  // Run scan
  try {
    const result = await scan(targetPath, config);

    // Output
    if (config.format === "json") {
      console.log(reportJson(result));
    } else {
      reportCli(result);
    }

    // Exit code: 0 = clean, 1 = findings
    process.exit(result.summary.total > 0 ? 1 : 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Scan failed: ${message}`);
    process.exit(2);
  }
}
