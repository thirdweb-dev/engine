import crypto from "crypto";
import { env } from "../../src/utils/env";
import { EncryptionConfig } from "../schemas/config";

const ENCRYPTION_KEY_LENGTH = 32; // For AES-256-GCM
const IV_LENGTH = 16; // For AES-256-GCM
const SALT = env.THIRDWEB_API_SECRET_KEY;

/**
 * Encrypts the given text using AES-256-GCM with a salt
 * @param text The text to encrypt
 * @returns An object containing the encrypted data, the IV and the auth tag
 */
export const encryptText = (text: string): EncryptionConfig => {
  // Generate a 256-bit key from the salt
  const key = crypto.scryptSync(SALT, "mysalt", ENCRYPTION_KEY_LENGTH);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
    authTag: authTag.toString("hex"),
  };
};

/**
 * Decrypts the given encrypted object using AES-256-GCM with a salt
 * @param encryptedObj The encrypted object to decrypt
 * @returns The decrypted text
 */
export function decryptText(encryptedObj: EncryptionConfig): string {
  // Generate a 256-bit key from the salt
  const key = crypto.scryptSync(SALT, "mysalt", ENCRYPTION_KEY_LENGTH);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedObj.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, "hex"));

  let decrypted = decipher.update(encryptedObj.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
