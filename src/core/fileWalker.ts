import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import type { FileEntry, ScanConfig } from "../types/index.js";
import { isBinaryFile, isIgnoredPath, isIgnoredFile, isSymlink, getFileSize } from "../utils/fs.js";
import {
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_IGNORE_PATHS,
  DEFAULT_IGNORE_FILES,
} from "../utils/constants.js";
import { logger } from "../utils/logger.js";

export interface WalkOptions {
  maxFileSize: number;
  followSymlinks: boolean;
  ignorePaths: string[];
  ignoreFiles: string[];
}

const DEFAULT_WALK_OPTIONS: WalkOptions = {
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  followSymlinks: false,
  ignorePaths: DEFAULT_IGNORE_PATHS,
  ignoreFiles: DEFAULT_IGNORE_FILES,
};

/**
 * Recursively walk a directory and yield text file entries.
 * Skips: binary files, ignored paths, symlinks, oversized files.
 */
export async function* walkFiles(
  rootPath: string,
  options: Partial<WalkOptions> = {},
): AsyncGenerator<FileEntry> {
  const opts = { ...DEFAULT_WALK_OPTIONS, ...options };
  const absoluteRoot = path.resolve(rootPath);

  yield* walkDir(absoluteRoot, absoluteRoot, opts);
}

async function* walkDir(
  dirPath: string,
  rootPath: string,
  opts: WalkOptions,
): AsyncGenerator<FileEntry> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    logger.warn(`Cannot read directory: ${dirPath}`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    // Check ignored paths (works for both files and directories)
    if (isIgnoredPath(relativePath, opts.ignorePaths)) continue;

    if (entry.isDirectory()) {
      yield* walkDir(fullPath, rootPath, opts);
      continue;
    }

    if (!entry.isFile()) {
      // Skip symlinks unless configured
      if (entry.isSymbolicLink() && !opts.followSymlinks) continue;
      continue;
    }

    // Skip symlinks
    if (!opts.followSymlinks && isSymlink(fullPath)) continue;

    // Skip ignored files
    if (isIgnoredFile(fullPath, opts.ignoreFiles)) continue;

    // Skip oversized files
    const size = getFileSize(fullPath);
    if (size > opts.maxFileSize) {
      logger.warn(`Skipped large file: ${relativePath} (${(size / 1024 / 1024).toFixed(1)}MB > ${(opts.maxFileSize / 1024 / 1024).toFixed(0)}MB)`);
      continue;
    }

    // Skip binary files
    try {
      if (isBinaryFile(fullPath)) continue;
    } catch {
      continue;
    }

    yield { path: fullPath, relativePath };
  }
}

/**
 * Read lines from a file as a stream. Respects maxLines and maxLineLength.
 */
export async function readFileLines(
  filePath: string,
  maxLines: number = 2000,
  maxLineLength: number = 10_000,
): Promise<{ lines: string[]; truncated: boolean }> {
  const lines: string[] = [];
  let truncated = false;

  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }

    // Skip extremely long lines (minified JS)
    if (line.length > maxLineLength) {
      lines.push(""); // placeholder to keep line numbers correct
      continue;
    }

    lines.push(line);
  }

  stream.destroy();
  return { lines, truncated };
}
