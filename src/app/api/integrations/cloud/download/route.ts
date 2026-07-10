import { NextRequest, NextResponse } from "next/server";

import { refreshIfNeeded } from "@/lib/integrations/oauth";
import { readToken } from "@/lib/integrations/tokens";

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  const fileId = request.nextUrl.searchParams.get("fileId");
  const mimeType = request.nextUrl.searchParams.get("mimeType") || "";

  if (provider !== "google-drive" && provider !== "onedrive") {
    return NextResponse.json({ error: "invalid provider" }, { status: 400 });
  }
  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  const token = (await refreshIfNeeded(provider)) || (await readToken(provider));
  if (!token?.accessToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  try {
    let downloadUrl: string;
    let filename = "import.csv";

    if (provider === "google-drive") {
      if (mimeType === "application/vnd.google-apps.spreadsheet") {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/csv`;
        filename = "google-sheet.csv";
      } else {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      }
      // Fetch metadata for name
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType`,
        { headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as { name?: string; mimeType?: string };
        if (meta.name) {
          filename = meta.name.endsWith(".csv")
            ? meta.name
            : meta.mimeType === "application/vnd.google-apps.spreadsheet"
              ? `${meta.name}.csv`
              : meta.name;
        }
      }
    } else {
      downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`;
      const metaRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}?$select=name`,
        { headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as { name?: string };
        if (meta.name) filename = meta.name;
      }
    }

    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
      redirect: "follow",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "download_failed", detail: text.slice(0, 400) },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "X-Filename": encodeURIComponent(filename),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "download_failed" },
      { status: 500 }
    );
  }
}
