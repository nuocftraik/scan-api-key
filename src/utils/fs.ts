import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_IGNORE_PATHS, DEFAULT_IGNORE_FILES } from "./constants.js";

/**
 * Detect if a file is binary by checking for null bytes in the first 8KB.
 */
export function isBinaryFile(filePath: string): boolean {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Check if a file path matches any ignore path patterns.
 */
export function isIgnoredPath(
  filePath: string,
  ignorePaths: string[] = DEFAULT_IGNORE_PATHS,
): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");

  for (const ignore of ignorePaths) {
    if (segments.includes(ignore)) return true;
  }
  return false;
}

/**
 * Check if a file matches ignore file patterns (glob-like).
 * Supports: *.ext and exact filename matches.
 */
export function isIgnoredFile(
  filePath: string,
  ignoreFiles: string[] = DEFAULT_IGNORE_FILES,
): boolean {
  const basename = path.basename(filePath);

  for (const pattern of ignoreFiles) {
    if (pattern.startsWith("*")) {
      // *.ext pattern
      const ext = pattern.slice(1); // e.g. ".lock"
      if (basename.endsWith(ext)) return true;
    } else {
      // exact match
      if (basename === pattern) return true;
    }
  }
  return false;
}

/**
 * Check if a path is a symlink.
 */
export function isSymlink(filePath: string): boolean {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes. Returns -1 if file doesn't exist.
 */
export function getFileSize(filePath: string): number {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return -1;
  }
}
