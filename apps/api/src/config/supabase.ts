import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "./env";

export type Database = Record<string, unknown>;

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

/** Privileged server client — never expose to browsers. */
export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const env = getEnv();
  serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/** Anon client used only to validate user JWTs via auth.getUser. */
export function getAnonClient(): SupabaseClient {
  if (anonClient) return anonClient;
  const env = getEnv();
  anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}

export async function pingDatabase(): Promise<boolean> {
  const client = getServiceClient();
  const { error } = await client.from("profiles").select("id").limit(1);
  // Empty table is fine; connection errors are not
  if (error && /fetch|network|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
    return false;
  }
  return true;
}
