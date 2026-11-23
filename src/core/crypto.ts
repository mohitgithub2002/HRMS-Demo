/**
 * Field encryption (Aadhaar, PAN, bank account), duplicate-finding hashes and OTP hashing.
 *
 * Every organisation has its own keys, derived from the master keys and its tenant id with HKDF-SHA256. A value
 * encrypted for one organisation cannot be decrypted as another's, and the same PAN gives different hashes in two
 * organisations (so hashes reveal nothing across them). Format: "v1.<iv>.<tag>.<ciphertext>" (base64url).
 *
 * Not "server-only": the seed uses it. Keys come from the environment (src/core/env.ts checks them).
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1";

function master(name: "DATA_ENCRYPTION_KEY" | "BLIND_INDEX_KEY" | "OTP_PEPPER"): Buffer {
  const v = process.env[name];
  const key = v ? Buffer.from(v, "base64") : null;
  if (!key || key.length !== 32) throw new Error(`${name} must be 32 bytes, base64 encoded`);
  return key;
}

const derived = new Map<string, Buffer>();

/** The organisation's own key for a purpose. */
export function tenantKey(tenantId: string, purpose: "enc" | "index"): Buffer {
  const id = `${purpose}:${tenantId}`;
  let k = derived.get(id);
  if (!k) {
    const m = master(purpose === "enc" ? "DATA_ENCRYPTION_KEY" : "BLIND_INDEX_KEY");
    k = Buffer.from(hkdfSync("sha256", m, Buffer.from(tenantId, "utf8"), Buffer.from(`kosh:${purpose}:v1`, "utf8"), 32));
    if (derived.size > 2000) derived.clear();
    derived.set(id, k);
  }
  return k;
}

export function encryptWith(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptWith(key: Buffer, token: string): string {
  const [version, iv, tag, data] = token.split(".");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Unreadable encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function normaliseIdentifier(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export type SensitiveKind = "pan" | "aadhaar" | "bank";

export const encrypt = (tenantId: string, plain: string) => encryptWith(tenantKey(tenantId, "enc"), plain);
export const decrypt = (tenantId: string, token: string) => decryptWith(tenantKey(tenantId, "enc"), token);

/** Keyed hash to find duplicates without decrypting. "abcde1234f" and "ABCDE1234F" collide, as they should. */
export function blindIndex(tenantId: string, kind: string, value: string): string {
  return createHmac("sha256", tenantKey(tenantId, "index")).update(`${kind}:${normaliseIdentifier(value)}`).digest("hex");
}

/** { enc, hash, last4 } ready to store for a sensitive identifier. */
export function seal(tenantId: string, kind: SensitiveKind, value: string) {
  const clean = normaliseIdentifier(value);
  return { enc: encrypt(tenantId, clean), hash: blindIndex(tenantId, kind, clean), last4: clean.slice(-4) };
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** OTP hashes are peppered so a database leak alone does not reveal live codes. */
export function hashOtp(challengeId: string, code: string): string {
  return createHmac("sha256", master("OTP_PEPPER")).update(`${challengeId}:${code}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomDigits(length: number): string {
  let out = "";
  while (out.length < length) {
    const byte = randomBytes(1)[0];
    if (byte < 250) out += String(byte % 10);
  }
  return out;
}

/** A readable one-time password: no look-alike characters, always a letter, a digit and a symbol. */
export function temporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (s: string) => s[randomBytes(1)[0] % s.length];
  let core = "";
  for (let i = 0; i < 6; i++) core += pick(letters);
  return `${core}@${pick(digits)}${pick(digits)}${pick(digits)}`;
}
