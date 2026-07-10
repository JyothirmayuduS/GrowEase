export type AiProviderName = "anthropic" | "openai" | "gemini" | "heuristic";

export function getAiProviderName(): AiProviderName {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (
    explicit === "anthropic" ||
    explicit === "openai" ||
    explicit === "gemini" ||
    explicit === "heuristic"
  ) {
    return explicit;
  }

  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";

  return "heuristic";
}

export function getAiModel(provider: AiProviderName): string {
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
  }
  if (provider === "gemini") {
    return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function isAiConfigured(): boolean {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "heuristic") return true;
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY
  );
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

  const providerLabel =
    provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "Anthropic";
  const billingUrl =
    provider === "openai"
      ? "https://platform.openai.com/account/billing"
      : provider === "gemini"
        ? "https://ai.google.dev/"
        : "https://console.anthropic.com/settings/billing";

  const options = [
    `Add billing or credits in your ${providerLabel} account (${billingUrl}).`,
    `Replace the ${providerLabel} API key with a key that has available quota.`,
  ];

  return new Error(`${providerLabel} API quota exceeded or rate limited. ${options.join(" ")}`);
}

export async function callAiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = getAiProviderName();
  const model = getAiModel(provider);

  try {
    if (provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const result = await geminiModel.generateContent(userPrompt);
      const text = result.response.text();
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    }

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
