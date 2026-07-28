import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard IV length for GCM (96 bits)
const PREFIX = "enc:v1:";

/**
 * Reads and validates ENCRYPTION_KEY from environment.
 * Supports 64-char hex strings, 32-byte ASCII, base64, or derives a 32-byte hash.
 * Never logs the key value.
 */
function getEncryptionKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    return Buffer.from(keyStr, "hex");
  }
  if (keyStr.length === 32) {
    return Buffer.from(keyStr, "utf-8");
  }
  try {
    const buf = Buffer.from(keyStr, "base64");
    if (buf.length === 32) {
      return buf;
    }
  } catch {
    // Ignore invalid base64 and fallback to SHA-256 derivation
  }

  // Derive a secure 32-byte key from whatever string was provided
  return crypto.createHash("sha256").update(keyStr).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns ciphertext formatted as `enc:v1:<ivHex>:<authTagHex>:<ciphertextHex>`.
 * Returns null/undefined as-is.
 */
export function encryptToken<T extends string | null | undefined>(
  token: T
): T {
  if (token == null || token === "") {
    return token;
  }
  // If already encrypted, return as-is
  if (typeof token === "string" && token.startsWith(PREFIX)) {
    return token;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(token, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}${iv.toString("hex")}:${authTag}:${ciphertext}` as T;
}

/**
 * Decrypts an AES-256-GCM encrypted token formatted as `enc:v1:<ivHex>:<authTagHex>:<ciphertextHex>`.
 * If the token does not have the `enc:v1:` prefix, returns it unchanged (backwards compatibility).
 */
export function decryptToken<T extends string | null | undefined>(
  token: T
): T {
  if (token == null || token === "") {
    return token;
  }
  if (typeof token === "string" && !token.startsWith(PREFIX)) {
    // Legacy unencrypted token fallback
    return token;
  }

  const parts = (token as string).split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted token payload format");
  }

  const [, , ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertextHex, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext as T;
}
