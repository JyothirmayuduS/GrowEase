import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";
import { AIProviderError, ErrorCodes } from "../../utils/errors";
import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";
import { HeuristicProvider } from "./heuristic-provider";

export function createAIProvider(): AIProvider {
  const env = getEnv();
  if (env.AI_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
    return withRetries(new GeminiProvider());
  }
  if (env.OPENAI_API_KEY) {
    return withRetries(new OpenAIProvider());
  }
  if (env.GEMINI_API_KEY) {
    return withRetries(new GeminiProvider());
  }
  logger.warn("No AI API key configured — using heuristic provider");
  return withRetries(new HeuristicProvider());
}

function withRetries(inner: AIProvider): AIProvider {
  const max = getEnv().AI_MAX_RETRIES;
  return {
    async analyzeColumns(input) {
      return retry(() => inner.analyzeColumns(input), max, "analyzeColumns");
    },
    async extractRecords(input) {
      return retry(() => inner.extractRecords(input), max, "extractRecords");
    },
  };
}

async function retry<T>(fn: () => Promise<T>, max: number, label: string): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      logger.warn({ attempt, label }, "ai_retry");
      await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
    }
  }
  if (last instanceof AIProviderError) throw last;
  throw new AIProviderError(`AI ${label} failed after retries`, ErrorCodes.AI_PROVIDER_ERROR);
}
