export type AiProviderName = "anthropic" | "openai";

export function getAiProviderName(): AiProviderName {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "openai") return explicit;

  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";

  throw new Error(
    "No AI API key configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local"
  );
}

export function getAiModel(provider: AiProviderName): string {
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export async function callAiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = getAiProviderName();
  const model = getAiModel(provider);

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
}
