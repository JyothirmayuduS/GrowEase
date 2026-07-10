import type {
  ColumnMappingResult,
  ExtractedRecordResult,
} from "../../types/domain";

export interface AnalyzeColumnsInput {
  headers: string[];
  sampleRows: Record<string, string>[];
}

export interface ExtractRecordsInput {
  headers: string[];
  rows: Record<string, string>[];
  mappings: ColumnMappingResult["mappings"];
  startRowNumber: number;
}

export interface AIProvider {
  analyzeColumns(input: AnalyzeColumnsInput): Promise<ColumnMappingResult>;
  extractRecords(input: ExtractRecordsInput): Promise<ExtractedRecordResult>;
}
