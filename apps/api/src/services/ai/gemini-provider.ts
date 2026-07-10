import { GoogleGenerativeAI } from "@google/generative-ai";

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

export class GeminiProvider implements AIProvider {
  private model;

  constructor() {
    const genAI = new GoogleGenerativeAI(getEnv().GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: getEnv().GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    });
  }

  async analyzeColumns(input: AnalyzeColumnsInput) {
    const text = await this.generate(
      `${COLUMN_PROMPT}\n\n${JSON.stringify({
        headers: input.headers,
        sampleRows: input.sampleRows.slice(0, 5),
      })}`
    );
    return parseColumnMapping(parseJsonLoose(text));
  }

  async extractRecords(input: ExtractRecordsInput) {
    const text = await this.generate(
      `${EXTRACT_PROMPT}\n\n${JSON.stringify({
        mappings: input.mappings,
        headers: input.headers,
        rows: input.rows,
        startRowNumber: input.startRowNumber,
      })}`
    );
    const parsed = parseExtractedRecords(parseJsonLoose(text));
    parsed.records = parsed.records.map((r, i) => ({
      ...r,
      row_number: r.row_number ?? input.startRowNumber + i,
      original_record: Object.keys(r.original_record || {}).length
        ? r.original_record
        : input.rows[i] || {},
    }));
    return parsed;
  }

  private async generate(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      if (!text) {
        throw new AIProviderError("Empty Gemini response", ErrorCodes.AI_INVALID_RESPONSE);
      }
      return text;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      const msg = err instanceof Error ? err.message : "Gemini error";
      throw new AIProviderError(msg, ErrorCodes.AI_PROVIDER_ERROR);
    }
  }
}
