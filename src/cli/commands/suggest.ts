import prompts from "prompts";
import { huntCommand } from "./hunt.js";
import { blue, dim, green } from "../../reporting/formatter.js";

const SUGGESTIONS = [
  {
    title: "OpenAI Project Keys",
    description: "Highly confident, modern OpenAI keys",
    value: "sk-proj-",
    provider: "openai",
  },
  {
    title: "OpenAI Standard Keys",
    description: "Legacy or generic OpenAI keys",
    value: "OPENAI_API_KEY sk-",
    provider: "openai",
  },
  {
    title: "OpenAI Codex Keys",
    description: "OpenAI Codex API keys",
    value: "CODEX_API_KEY sk-",
    provider: "openai",
  },
  {
    title: "AWS Secrets",
    description: "AWS Access Keys & Secrets",
    value: "AKIA AWS_SECRET_ACCESS_KEY",
    provider: "aws",
  },
  {
    title: "GitHub Tokens",
    description: "GitHub Personal Access Tokens",
    value: "ghp_",
    provider: "github",
  },
  {
    title: "GitHub Copilot Tokens",
    description: "GitHub Copilot App/OAuth Tokens",
    value: "ghu_ COPILOT",
    provider: "copilot",
  },
  {
    title: "Anthropic Claude Keys",
    description: "Anthropic API Keys",
    value: "sk-ant-api03-",
    provider: "anthropic",
  },
  {
    title: "Gemini API Keys",
    description: "Google Gemini (Generative AI) Keys",
    value: "GEMINI_API_KEY AIzaSy",
    provider: "gemini",
  },
  {
    title: "Google Cloud Keys",
    description: "General Google Cloud API Keys",
    value: "GOOGLE_API_KEY AIzaSy",
    provider: "google",
  },
  {
    title: "Hugging Face Tokens",
    description: "Hugging Face Access Tokens",
    value: "hf_",
    provider: "huggingface",
  },
  {
    title: "Cursor API Keys",
    description: "Cursor IDE API Keys",
    value: "sk_cursor_",
    provider: "cursor",
  },
  {
    title: "Replicate Tokens",
    description: "Replicate API Tokens",
    value: "r8_",
    provider: "replicate",
  },
  {
    title: "Stripe Live Keys",
    description: "Stripe Live Payment Keys",
    value: "sk_live_",
    provider: "stripe",
  },
  {
    title: "Slack Bot Tokens",
    description: "Slack App/Bot Tokens",
    value: "xoxb-",
    provider: "slack",
  },
  {
    title: "Generic Secrets",
    description: "High entropy strings near keywords",
    value: "SECRET_KEY Bearer",
    provider: "generic",
  }
];

export async function suggestCommand() {
  console.log(blue("\n💡 Secret Key Hacker Bot - Interactive Suggestions\n"));
  
  const response = await prompts([
    {
      type: "select",
      name: "selection",
      message: "Select a target platform to hunt on GitHub:",
      choices: SUGGESTIONS.map(s => ({ title: s.title, description: s.description, value: s })),
    },
    {
      type: "number",
      name: "limit",
      message: "How many valid keys do you want to find? (Max: 100)",
      initial: 30,
      min: 1,
      max: 100,
    },
    {
      type: "confirm",
      name: "execute",
      message: (prev, values) => `Run ${green(`sks hunt "${values.selection.value}" --limit ${values.limit} --provider ${values.selection.provider}`)} now?`,
      initial: true,
    }
  ]);

  if (!response.selection) {
    console.log(dim("Canceled."));
    return;
  }

  const { value: query, provider } = response.selection;

  if (response.execute) {
    console.log("");
    await huntCommand(query, { limit: response.limit.toString(), provider });
  } else {
    console.log(`\nYou can run this manually anytime:\n  ${green(`sks hunt "${query}" --limit ${response.limit} --provider ${provider}`)}\n`);
  }
}
