import crypto from "crypto";
import { env } from "./env";

export const encrypt = (data: string): string => {
  return CryptoJS.AES.encrypt(data, env.ENCRYPTION_PASSWORD).toString();
};

export const decrypt = (data: string, password: string) => {
  return CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8);
};

export const isWellFormedPublicKey = (key: string) => {
  try {
    crypto.createPublicKey(key);
    return true;
  } catch (e) {
    return false;
  }
};
