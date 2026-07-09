export type AppView = "upload" | "processing" | "preview" | "importing" | "results";

export interface ParsedCsv {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: Record<string, string>[];
}
