import OpenAI from "openai";

import { getEnv } from "../../config/env";
import { AIProviderError, ErrorCodes } from "../../utils/errors";
import type { AIProvider, AnalyzeColumnsInput, ExtractRecordsInput } from "./types";
import {
  COLUMN_PROMPT,
  EXTRACT_PROMPT,
  parseColumnMapping,
  parseExtractedRecords,
  parseJsonLoose,
} from "./prompts";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  }

  async analyzeColumns(input: AnalyzeColumnsInput) {
    const content = await this.chat([
      { role: "system", content: COLUMN_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          headers: input.headers,
          sampleRows: input.sampleRows.slice(0, 5),
        }),
      },
    ]);
    return parseColumnMapping(parseJsonLoose(content));
  }

  async extractRecords(input: ExtractRecordsInput) {
    const content = await this.chat([
      { role: "system", content: EXTRACT_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          mappings: input.mappings,
          headers: input.headers,
          rows: input.rows,
          startRowNumber: input.startRowNumber,
        }),
      },
    ]);
    const parsed = parseExtractedRecords(parseJsonLoose(content));
    parsed.records = parsed.records.map((r, i) => ({
      ...r,
      row_number: r.row_number ?? input.startRowNumber + i,
      original_record: r.original_record?.name
        ? r.original_record
        : input.rows[i] || r.original_record || {},
    }));
    return parsed;
  }

  private async chat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<string> {
    try {
      const res = await this.client.chat.completions.create({
        model: getEnv().OPENAI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages,
      });
      const text = res.choices[0]?.message?.content;
      if (!text) {
        throw new AIProviderError("Empty OpenAI response", ErrorCodes.AI_INVALID_RESPONSE);
      }
      return text;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      const msg = err instanceof Error ? err.message : "OpenAI error";
      if (/rate/i.test(msg)) {
        throw new AIProviderError(msg, ErrorCodes.AI_RATE_LIMIT);
      }
      if (/timeout/i.test(msg)) {
        throw new AIProviderError(msg, ErrorCodes.AI_TIMEOUT);
      }
      throw new AIProviderError(msg, ErrorCodes.AI_PROVIDER_ERROR);
    }
  }
}
