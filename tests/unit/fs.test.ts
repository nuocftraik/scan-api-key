import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { isBinaryFile, isIgnoredPath, isIgnoredFile } from "../../src/utils/fs.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "..", "fixtures");

describe("isBinaryFile", () => {
  it("should detect binary file", () => {
    const binPath = path.join(FIXTURES_DIR, "edge", "binary.bin");
    expect(isBinaryFile(binPath)).toBe(true);
  });

  it("should detect text file as non-binary", () => {
    const textPath = path.join(FIXTURES_DIR, "invalid", "clean.js");
    expect(isBinaryFile(textPath)).toBe(false);
  });
});

describe("isIgnoredPath", () => {
  it("should ignore node_modules", () => {
    expect(isIgnoredPath("project/node_modules/package/index.js")).toBe(true);
  });

  it("should ignore .git", () => {
    expect(isIgnoredPath("project/.git/config")).toBe(true);
  });

  it("should ignore dist", () => {
    expect(isIgnoredPath("project/dist/bundle.js")).toBe(true);
  });

  it("should NOT ignore normal paths", () => {
    expect(isIgnoredPath("project/src/config.js")).toBe(false);
  });

  it("should work with backslashes (Windows)", () => {
    expect(isIgnoredPath("project\\node_modules\\pkg\\index.js")).toBe(true);
  });

  it("should accept custom ignore list", () => {
    expect(isIgnoredPath("project/custom_dir/file.js", ["custom_dir"])).toBe(true);
  });
});

describe("isIgnoredFile", () => {
  it("should ignore lockfiles by exact name", () => {
    expect(isIgnoredFile("project/package-lock.json")).toBe(true);
    expect(isIgnoredFile("project/yarn.lock")).toBe(true);
  });

  it("should ignore by extension pattern", () => {
    expect(isIgnoredFile("project/style.min.css")).toBe(true);
    expect(isIgnoredFile("project/bundle.min.js")).toBe(true);
  });

  it("should ignore *.lock files", () => {
    expect(isIgnoredFile("project/something.lock")).toBe(true);
  });

  it("should NOT ignore normal files", () => {
    expect(isIgnoredFile("project/src/index.ts")).toBe(false);
  });
});
