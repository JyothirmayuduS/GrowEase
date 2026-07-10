import { NextResponse } from "next/server";

import { refreshIfNeeded } from "@/lib/integrations/oauth";
import { readToken } from "@/lib/integrations/tokens";

/**
 * Google Ads customer list requires a developer token + Ads API client library.
 * With OAuth alone we confirm the Google identity is connected for Ads scope.
 * When GOOGLE_ADS_DEVELOPER_TOKEN is set, we attempt a lightweight accessible-customers call.
 */
export async function GET() {
  const token = (await refreshIfNeeded("google-ads")) || (await readToken("google-ads"));
  if (!token?.accessToken) {
    return NextResponse.json({ error: "not_connected", provider: "google-ads" }, { status: 401 });
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, "");

  if (!developerToken) {
    return NextResponse.json({
      provider: "google-ads",
      email: token.email,
      name: token.name,
      connected: true,
      customers: [],
      note: "OAuth connected. Add GOOGLE_ADS_DEVELOPER_TOKEN (from Google Ads API Center) to list customer accounts.",
    });
  }

  try {
    const res = await fetch(
      "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "developer-token": developerToken,
          ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        provider: "google-ads",
        email: token.email,
        name: token.name,
        connected: true,
        customers: [],
        note: `Ads API response: ${text.slice(0, 300)}`,
      });
    }
    const data = (await res.json()) as { resourceNames?: string[] };
    const customers = (data.resourceNames ?? []).map((rn) => ({
      resourceName: rn,
      customerId: rn.split("/")[1] ?? rn,
    }));
    return NextResponse.json({
      provider: "google-ads",
      email: token.email,
      name: token.name,
      connected: true,
      customers,
    });
  } catch (err) {
    return NextResponse.json({
      provider: "google-ads",
      email: token.email,
      name: token.name,
      connected: true,
      customers: [],
      note: err instanceof Error ? err.message : "ads_api_error",
    });
  }
}
