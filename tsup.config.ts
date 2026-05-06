import { defineConfig } from "tsup";

export default defineConfig([
  // CLI entry (with shebang)
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    target: "node18",
    clean: true,
    sourcemap: true,
    splitting: false,
  },
  // Library entry (no shebang)
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node18",
    dts: false, // skip dts for now, use tsc separately if needed
    sourcemap: true,
    splitting: false,
  },
]);
