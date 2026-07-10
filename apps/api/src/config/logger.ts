import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "groweasy-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "access_token",
      "refresh_token",
      "encrypted_access_token",
      "encrypted_refresh_token",
      "email",
      "phone",
      "mobile",
      "*.email",
      "*.phone",
      "*.accessToken",
      "*.refreshToken",
    ],
    remove: true,
  },
});

/** Strip PII-ish fields from objects before logging. */
export function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 200) return `${value.slice(0, 40)}…[truncated ${value.length}]`;
    return value;
  }
  if (Array.isArray(value)) {
    return { length: value.length };
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (
        key.includes("token") ||
        key.includes("secret") ||
        key.includes("password") ||
        key.includes("email") ||
        key.includes("phone") ||
        key.includes("mobile") ||
        key === "original_record" ||
        key === "rows"
      ) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeForLog(v);
      }
    }
    return out;
  }
  return value;
}
