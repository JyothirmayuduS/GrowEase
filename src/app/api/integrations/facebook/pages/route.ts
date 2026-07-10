import { NextResponse } from "next/server";

import { refreshIfNeeded } from "@/lib/integrations/oauth";
import { readToken } from "@/lib/integrations/tokens";

export async function GET() {
  const token = (await refreshIfNeeded("facebook")) || (await readToken("facebook"));
  if (!token?.accessToken) {
    return NextResponse.json({ error: "not_connected", provider: "facebook" }, { status: 401 });
  }

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,tasks&limit=50&access_token=${encodeURIComponent(token.accessToken)}`
    );
    if (!pagesRes.ok) {
      const text = await pagesRes.text();
      return NextResponse.json(
        { error: "pages_failed", detail: text.slice(0, 400) },
        { status: 502 }
      );
    }
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{ id: string; name: string; access_token?: string }>;
    };

    const pages = [];
    for (const page of pagesData.data ?? []) {
      const formsRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}/leadgen_forms?fields=id,name,status,leads_count&limit=25&access_token=${encodeURIComponent(page.access_token || token.accessToken)}`
      );
      let forms: Array<{ id: string; name: string; status?: string; leads_count?: number }> = [];
      if (formsRes.ok) {
        const formsData = (await formsRes.json()) as { data?: typeof forms };
        forms = formsData.data ?? [];
      }
      pages.push({
        id: page.id,
        name: page.name,
        forms,
      });
    }

    return NextResponse.json({
      provider: "facebook",
      email: token.email,
      name: token.name,
      pages,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "facebook_failed" },
      { status: 500 }
    );
  }
}
