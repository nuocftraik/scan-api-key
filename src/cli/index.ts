#!/usr/bin/env node

import { Command } from "commander";
import { huntCommand } from "./commands/hunt.js";
import { suggestCommand } from "./commands/suggest.js";

const program = new Command();

program
  .name("sks")
  .description("🕵️ Secret Key Hacker Bot — Find leaked credentials on GitHub")
  .version("0.1.0");

program
  .command("hunt")
  .description("Hunt for leaked API keys directly on GitHub Search")
  .argument("<query>", "GitHub search query (e.g. 'OPENAI_API_KEY')")
  .option("--limit <number>", "Max files to scan from search results", "30")
  .option("--provider <name>", "Filter results by provider (e.g. openai, aws)")
  .action(huntCommand);

program
  .command("suggest")
  .description("Interactive suggestion menu to pick platforms and hunt")
  .action(suggestCommand);

program.parse();
