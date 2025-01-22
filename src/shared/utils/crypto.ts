import crypto from "crypto";
import CryptoJS from "crypto-js";
import { env } from "./env";

export const encrypt = (data: string): string => {
  return CryptoJS.AES.encrypt(data, env.ENCRYPTION_PASSWORD).toString();
};

export const decryptWithCustomPassword = (data: string, password: string) => {
  return CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8);
};

export const decrypt = (data: string) => {
  return decryptWithCustomPassword(data, env.ENCRYPTION_PASSWORD);
};

export const isWellFormedPublicKey = (key: string) => {
  try {
    crypto.createPublicKey(key);
    return true;
  } catch (_e) {
    return false;
  }
};
