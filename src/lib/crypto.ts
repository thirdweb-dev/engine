import { createPublicKey, pbkdf2Sync, randomBytes } from "node:crypto";
import { CompactEncrypt, compactDecrypt } from "jose";
import { type Result, ResultAsync, err, errAsync, ok } from "neverthrow";
import { env } from "./env";
import type { CryptoErr } from "./errors";

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

interface EncryptedData {
  salt: string;
  data: string;
}

function deriveKey(password: string, salt: Buffer): Result<Buffer, CryptoErr> {
  try {
    return ok(pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256"));
  } catch (error) {
    return err({
      kind: "crypto",
      code: "key_derivation_failed",
      status: 500,
      source: error instanceof Error ? error : undefined,
    });
  }
}

export function encrypt(data: string): ResultAsync<string, CryptoErr> {
  const salt = randomBytes(SALT_LENGTH);

  return deriveKey(env.ENCRYPTION_PASSWORD, salt)
    .asyncAndThen((key) =>
      ResultAsync.fromPromise(
        new CompactEncrypt(new TextEncoder().encode(data))
          .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
          .encrypt(key),
        (error): CryptoErr => ({
          kind: "crypto",
          code: "encryption_failed",
          status: 500,
          message: "JWE encryption failed",
          source: error instanceof Error ? error : undefined,
        }),
      ),
    )
    .map((jwe) => {
      const result: EncryptedData = {
        salt: salt.toString("base64"),
        data: jwe,
      };
      return JSON.stringify(result);
    });
}

export function decrypt(encrypted: string): ResultAsync<string, CryptoErr> {
  let parsed: EncryptedData;
  try {
    parsed = JSON.parse(encrypted) as EncryptedData;
  } catch (error) {
    return errAsync({
      kind: "crypto",
      code: "invalid_format_not_json",
      status: 500,
      message: "Invalid encrypted data format, could not parse JSON",
      source: error instanceof Error ? error : undefined,
    });
  }

  const saltBuffer = Buffer.from(parsed.salt, "base64");

  return deriveKey(env.ENCRYPTION_PASSWORD, saltBuffer)
    .asyncAndThen((key) =>
      ResultAsync.fromPromise(
        compactDecrypt(parsed.data, key),
        (error): CryptoErr => ({
          kind: "crypto",
          code: "decryption_failed",
          status: 500,
          message: "JWE decryption failed",
          source: error instanceof Error ? error : undefined,
        }),
      ),
    )
    .map(({ plaintext }) => new TextDecoder().decode(plaintext));
}
export function legacyEncrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, env.ENCRYPTION_PASSWORD).toString();
}

export function legacyDecryptWith(data: string, password: string) {
  return CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8);
}

export function isWellFormedPublicKey(key: string) {
  try {
    createPublicKey(key);
    return true;
  } catch (_e) {
    return false;
  }
}
