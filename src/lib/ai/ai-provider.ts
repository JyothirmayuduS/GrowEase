export type AiProviderName = "anthropic" | "openai" | "heuristic";

export function getAiProviderName(): AiProviderName {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "openai" || explicit === "heuristic") {
    return explicit;
  }

  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";

  return "heuristic";
}

export function getAiModel(provider: AiProviderName): string {
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function isAiConfigured(): boolean {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "heuristic") return true;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function getApiErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function isQuotaOrRateLimitError(error: unknown): boolean {
  const status = getApiErrorStatus(error);
  if (status === 429) return true;

  const message = error instanceof Error ? error.message : String(error);
  return /quota|rate.?limit|billing|insufficient/i.test(message);
}

export function formatAiApiError(error: unknown, provider: AiProviderName): Error {
  if (!isQuotaOrRateLimitError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const providerLabel = provider === "openai" ? "OpenAI" : "Anthropic";
  const billingUrl =
    provider === "openai"
      ? "https://platform.openai.com/account/billing"
      : "https://console.anthropic.com/settings/billing";

  const alternateProvider =
    provider === "openai"
      ? {
          name: "Anthropic",
          envKey: "ANTHROPIC_API_KEY",
          providerValue: "anthropic",
        }
      : {
          name: "OpenAI",
          envKey: "OPENAI_API_KEY",
          providerValue: "openai",
        };

  const hasAlternateKey = Boolean(process.env[alternateProvider.envKey]);

  const options = [
    `Add billing or credits in your ${providerLabel} account (${billingUrl}).`,
    hasAlternateKey
      ? `Switch to ${alternateProvider.name}: set AI_PROVIDER=${alternateProvider.providerValue} in .env.local and restart the dev server.`
      : `Use a ${alternateProvider.name} API key instead: add ${alternateProvider.envKey} and set AI_PROVIDER=${alternateProvider.providerValue} in .env.local.`,
    `Replace the ${providerLabel} API key with a key that has available quota.`,
  ];

  return new Error(`${providerLabel} API quota exceeded or rate limited. ${options.join(" ")}`);
}

export async function callAiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = getAiProviderName();
  const model = getAiModel(provider);

  try {
    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Empty response from Anthropic");
      }
      return textBlock.text;
    }

    const { default: OpenAI } = await import("openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");
    return content;
  } catch (error) {
    throw formatAiApiError(error, provider);
  }
}
