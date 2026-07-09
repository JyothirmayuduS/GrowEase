import type { ImportApiRequest, ImportApiResponse, ImportStreamEvent } from "@/lib/types/crm";

export async function streamImport(
  payload: ImportApiRequest,
  onProgress: (percent: number, status: string) => void
): Promise<ImportApiResponse> {
  const response = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "" }));
    const fallback =
      response.status >= 500
        ? "Server error — run npm run dev:reset and try again."
        : "Import request failed";
    throw new Error(err.error || fallback);
  }

  if (!response.body) {
    throw new Error("No response stream from server");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ImportApiResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ImportStreamEvent;

      if (event.type === "progress") {
        onProgress(event.percent, event.status);
      } else if (event.type === "complete") {
        finalResult = event.data;
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }

  if (!finalResult) {
    throw new Error("Import completed without result data");
  }

  return finalResult;
}
