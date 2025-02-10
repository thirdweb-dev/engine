import CryptoJS from "crypto-js";
import crypto from "node:crypto";
import { env } from "./env.js";

export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, env.ENCRYPTION_PASSWORD).toString();
}

export function decrypt(data: string, password: string) {
  return CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8);
}

export function isWellFormedPublicKey(key: string) {
  try {
    crypto.createPublicKey(key);
    return true;
  } catch (_e) {
    return false;
  }
}
