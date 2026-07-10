import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { getIntegrationSecret } from "./config";

function keyBytes(): Buffer {
  return createHash("sha256").update(getIntegrationSecret()).digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptJson<T>(payload: string): T | null {
  try {
    const buf = Buffer.from(payload, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function signState(payload: Record<string, string>): string {
  return encryptJson({ ...payload, ts: String(Date.now()) });
}

export function verifyState(state: string, maxAgeMs = 15 * 60 * 1000): Record<string, string> | null {
  const parsed = decryptJson<Record<string, string> & { ts?: string }>(state);
  if (!parsed?.ts) return null;
  const age = Date.now() - Number(parsed.ts);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return null;
  const { ts: _ts, ...rest } = parsed;
  return rest;
}
