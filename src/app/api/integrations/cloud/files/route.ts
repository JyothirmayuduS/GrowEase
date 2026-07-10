import { NextRequest, NextResponse } from "next/server";

import { refreshIfNeeded } from "@/lib/integrations/oauth";
import { readToken } from "@/lib/integrations/tokens";

export interface CloudFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  webUrl?: string;
}

function isCsvLike(name: string, mime?: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv")) return true;
  if (mime?.includes("csv")) return true;
  if (mime === "text/plain" && lower.includes("csv")) return true;
  // Google Sheets exportable
  if (mime === "application/vnd.google-apps.spreadsheet") return true;
  return false;
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  if (provider !== "google-drive" && provider !== "onedrive") {
    return NextResponse.json({ error: "provider must be google-drive or onedrive" }, { status: 400 });
  }

  const token = (await refreshIfNeeded(provider)) || (await readToken(provider));
  if (!token?.accessToken) {
    return NextResponse.json({ error: "not_connected", provider }, { status: 401 });
  }

  try {
    if (provider === "google-drive") {
      const q = encodeURIComponent(
        "trashed=false and (mimeType='text/csv' or mimeType='application/vnd.google-apps.spreadsheet' or name contains '.csv')"
      );
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=40&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&q=${q}&orderBy=modifiedTime desc`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: "drive_list_failed", detail: text.slice(0, 400) },
          { status: 502 }
        );
      }
      const data = (await res.json()) as {
        files?: Array<{
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          modifiedTime?: string;
          webViewLink?: string;
        }>;
      };
      const files: CloudFileItem[] = (data.files ?? [])
        .filter((f) => isCsvLike(f.name, f.mimeType))
        .map((f) => ({
          id: f.id,
          name: f.name.endsWith(".csv") ? f.name : `${f.name}.csv`,
          mimeType: f.mimeType,
          size: f.size ? Number(f.size) : undefined,
          modifiedTime: f.modifiedTime,
          webUrl: f.webViewLink,
        }));
      return NextResponse.json({
        provider,
        email: token.email,
        name: token.name,
        files,
      });
    }

    // OneDrive via Microsoft Graph
    const url =
      "https://graph.microsoft.com/v1.0/me/drive/root/search(q='.csv')?$top=40&$select=id,name,size,lastModifiedDateTime,webUrl,file";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "onedrive_list_failed", detail: text.slice(0, 400) },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      value?: Array<{
        id: string;
        name: string;
        size?: number;
        lastModifiedDateTime?: string;
        webUrl?: string;
        file?: { mimeType?: string };
      }>;
    };
    const files: CloudFileItem[] = (data.value ?? [])
      .filter((f) => isCsvLike(f.name, f.file?.mimeType))
      .map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.file?.mimeType || "text/csv",
        size: f.size,
        modifiedTime: f.lastModifiedDateTime,
        webUrl: f.webUrl,
      }));
    return NextResponse.json({
      provider,
      email: token.email,
      name: token.name,
      files,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "list_failed" },
      { status: 500 }
    );
  }
}
