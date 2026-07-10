import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  BACKEND_URL: z.string().url().default("http://localhost:4000"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  AI_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  AI_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  AI_MAX_RETRIES: z.coerce.number().int().positive().default(3),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_DRIVE_REDIRECT_URI: z.string().optional().default(""),

  MICROSOFT_CLIENT_ID: z.string().optional().default(""),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(""),
  MICROSOFT_TENANT_ID: z.string().default("common"),
  MICROSOFT_OUTLOOK_REDIRECT_URI: z.string().optional().default(""),
  MICROSOFT_ONEDRIVE_REDIRECT_URI: z.string().optional().default(""),

  TOKEN_ENCRYPTION_KEY: z.string().min(16),
  OAUTH_STATE_SECRET: z.string().min(16),
  REQUEST_ID_HEADER: z.string().default("x-request-id"),

  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** Soft validation for /ready — returns missing keys without throwing. */
export function getEnvIssues(): string[] {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

export function corsOrigins(): string[] {
  return getEnv()
    .CORS_ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAiConfigured(): boolean {
  const env = getEnv();
  if (env.AI_PROVIDER === "openai") return Boolean(env.OPENAI_API_KEY);
  return Boolean(env.GEMINI_API_KEY);
}

export function isGoogleConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_DRIVE_REDIRECT_URI);
}

export function isMicrosoftConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
}
