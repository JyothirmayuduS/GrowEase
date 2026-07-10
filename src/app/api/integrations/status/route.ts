import { NextResponse } from "next/server";

import { listProviderStatus } from "@/lib/integrations/config";
import { listConnectedProviders } from "@/lib/integrations/tokens";

export async function GET() {
  const [status, connected] = await Promise.all([
    Promise.resolve(listProviderStatus()),
    listConnectedProviders(),
  ]);

  return NextResponse.json({
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    providers: status.map((s) => {
      const live = connected.find((c) => c.provider === s.provider);
      return {
        ...s,
        connected: live?.connected ?? false,
        email: live?.email,
        name: live?.name,
        expiresAt: live?.expiresAt,
      };
    }),
  });
}
