export type KeyStatus = "active" | "quota_exceeded" | "dead" | "unknown" | "unsupported";

/**
 * Verify if an API key is actually valid by calling the provider's API.
 */
export async function verifyKey(provider: string, key: string): Promise<KeyStatus> {
  const p = provider.toLowerCase();
  
  if (p === "openai") return verifyOpenAIKey(key);
  if (p === "anthropic") return verifyAnthropicKey(key);
  if (p === "github" || p === "copilot") return verifyGitHubKey(key);
  if (p === "gemini") return verifyGeminiKey(key);
  if (p === "huggingface") return verifyHuggingFaceKey(key);
  
  // Unsupported providers (e.g. generic, aws) bypass active verification
  return "unsupported";
}

async function verifyOpenAIKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` },
    });

    if (res.status === 200) return "active";
    if (res.status === 429) return "quota_exceeded";
    if (res.status === 401) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function verifyAnthropicKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }]
      })
    });

    if (res.status === 200) return "active";
    if (res.status === 429) return "quota_exceeded";
    // 400 could mean invalid request but authentication succeeded (e.g. wrong model, but valid key)
    if (res.status === 400) return "active"; 
    if (res.status === 401 || res.status === 403) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function verifyGitHubKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        "Authorization": `token ${key}`,
        "User-Agent": "sks-verifier"
      },
    });

    if (res.status === 200) return "active";
    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") return "quota_exceeded";
    if (res.status === 401) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function verifyGeminiKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      method: "GET",
    });

    if (res.status === 200) return "active";
    if (res.status === 429) return "quota_exceeded";
    // 400 typically means "API key not valid. Please pass a valid API key." for Gemini
    if (res.status === 400 || res.status === 403) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function verifyHuggingFaceKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch("https://huggingface.co/api/whoami-v2", {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` },
    });

    if (res.status === 200) return "active";
    if (res.status === 401) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}
