import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { getEnv } from "../../config/env";

export interface EncryptedPayload {
  v: number;
  iv: string;
  tag: string;
  ciphertext: string;
}

function keyMaterial(version = 1): Buffer {
  const raw = getEnv().TOKEN_ENCRYPTION_KEY;
  return createHash("sha256").update(`${version}:${raw}`).digest();
}

export class TokenEncryptionService {
  encrypt(value: string, version = 1): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyMaterial(version), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload: EncryptedPayload = {
      v: version,
      iv: iv.toString("base64url"),
      tag: tag.toString("base64url"),
      ciphertext: encrypted.toString("base64url"),
    };
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  }

  decrypt(encoded: string): string {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as EncryptedPayload;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyMaterial(parsed.v || 1),
      Buffer.from(parsed.iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.ciphertext, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}

export const tokenEncryption = new TokenEncryptionService();
