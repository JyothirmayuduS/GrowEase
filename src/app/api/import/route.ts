import { runServerImportPipeline } from "@/lib/ai/import-pipeline";
import type { ImportApiRequest, ImportStreamEvent } from "@/lib/types/crm";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Soft cap so a single request cannot exhaust serverless memory/time. */
const MAX_IMPORT_ROWS = 10000;

function encodeEvent(event: ImportStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportApiRequest;

    if (!body.headers || !Array.isArray(body.headers) || !Array.isArray(body.rows)) {
      return Response.json(
        { error: "Invalid request: headers and rows required" },
        { status: 400 }
      );
    }

    if (body.rows.length === 0) {
      return Response.json({ error: "CSV has no data rows" }, { status: 400 });
    }

    if (body.rows.length > MAX_IMPORT_ROWS) {
      return Response.json(
        {
          error: `Too many rows (${body.rows.length}). Maximum is ${MAX_IMPORT_ROWS} per import.`,
        },
        { status: 400 }
      );
    }

    if (body.headers.length === 0) {
      return Response.json({ error: "CSV has no columns" }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await runServerImportPipeline(
            body.headers,
            body.rows,
            body.fileName,
            (update) => {
              const event: ImportStreamEvent = {
                type: "progress",
                percent: update.percent,
                status: update.status,
                batch: update.batch,
                totalBatches: update.totalBatches,
              };
              controller.enqueue(encodeEvent(event));
            }
          );

          const completeEvent: ImportStreamEvent = { type: "complete", data: result };
          controller.enqueue(encodeEvent(completeEvent));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Import failed";
          controller.enqueue(encodeEvent({ type: "error", message }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
