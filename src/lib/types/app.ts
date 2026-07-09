export type AppView = "landing" | "preview" | "importing" | "results";

export interface ParsedCsv {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: Record<string, string>[];
}
